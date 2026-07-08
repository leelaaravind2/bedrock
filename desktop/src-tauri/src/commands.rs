// Thraksha desktop shell — Phase 4, Day 52: the command surface (thin invokers).
//
// The packaged Bedrock app invokes the Phase-4 generator surfaces (export / scan /
// impact-map / flow-map) + toolchain detect THROUGH these Tauri commands. Each command
// is a THIN INVOKER: it spawns the BUNDLED node sidecar against the resourced generator
// (resources/gen/dist/<entry>.js) — the SAME certified code the CLI runs — and returns
// its stdout. There is NO generation logic in Rust and NO reimplementation of any
// generator behavior (detect included — it shells out to the certified detect/probe.ts,
// it does not re-probe the toolchain in Rust). The shell runs the generator; it is not
// the generator.
//
// run_sidecar is the ONE shared spawn/capture primitive (the resource-dir resolution +
// the Day-5 forward-slash arg fix + the bundled-node spawn), factored out of lib.rs's
// startup self-test so both the self-test and every command go through it.

use tauri::{AppHandle, Manager};
use tauri_plugin_shell::ShellExt;

/// Resolve the resourced generator entry (`resources/gen/dist/<entry>`), spawn the
/// BUNDLED node sidecar with `<entry> <args...>`, and return its stdout.
///
/// Path hygiene (done ONCE here): resources ship under `<resource_dir>/resources/gen`
/// (layout preserved so `import.meta.url` finds the templates); the entry path is
/// forward-slashed and any `\\?\` verbatim prefix stripped — Node on Windows accepts
/// forward slashes, and this avoids the arg getting split on backslashes (the Day-5
/// `EISDIR 'E:'` bug). Verify-before-spawn: never fall back to the system node.
pub async fn run_sidecar(app: &AppHandle, entry: &str, args: Vec<String>) -> Result<String, String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("no resource_dir: {e}"))?;
    let entry_path = resource_dir
        .join("resources")
        .join("gen")
        .join("dist")
        .join(entry);
    if !entry_path.exists() {
        return Err(format!("sidecar entry not found: {}", entry_path.display()));
    }
    let entry_arg = {
        let s = entry_path.to_string_lossy().to_string();
        let s = s.strip_prefix(r"\\?\").map(|x| x.to_string()).unwrap_or(s);
        s.replace('\\', "/")
    };

    let cmd = app
        .shell()
        .sidecar("node")
        .map_err(|e| format!("sidecar resolve failed: {e}"))?;
    let mut cmd = cmd.arg(entry_arg);
    for a in args {
        cmd = cmd.arg(a);
    }
    let output = cmd
        .output()
        .await
        .map_err(|e| format!("sidecar spawn failed: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    if output.status.success() {
        Ok(stdout)
    } else {
        // A non-zero exit is either a real failure OR a deterministic GATE signal — e.g.
        // scan.js exits 1 when the deterministic (CERTAIN) scan finds an issue. Return
        // stdout AND stderr so the caller never loses the findings/diagnostics. (A richer
        // { stdout, exitCode } result is a later refinement; the thin-invoker path is
        // proven by stdout equivalence with the CLI either way.)
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("[sidecar exit {:?}]\n{stdout}{stderr}", output.status.code()))
    }
}

/// Append an optional `--flag value` pair to a sidecar arg vector (omitted ⇒ nothing,
/// which is the generator CLI's literal bypass — its built-in demo/default behavior).
fn push_opt(args: &mut Vec<String>, flag: &str, value: Option<String>) {
    if let Some(v) = value {
        args.push(flag.to_string());
        args.push(v);
    }
}

/// Export the standalone project to `target_dir`. → `dist/export.js`.
/// `model` (a BlueprintChoices JSON) exports a REAL blueprint; omitted ⇒ the demo model.
#[tauri::command]
pub async fn export_project(
    app: AppHandle,
    target_dir: String,
    backend: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    let mut args = vec![target_dir];
    push_opt(&mut args, "--backend", backend);
    push_opt(&mut args, "--model", model);
    run_sidecar(&app, "export.js", args).await
}

/// Run the deterministic (+ opt-in advisory) security scan on `project_dir`. → `dist/scan.js`.
#[tauri::command]
pub async fn scan_project(app: AppHandle, project_dir: String) -> Result<String, String> {
    run_sidecar(&app, "scan.js", vec![project_dir]).await
}

/// Preview the impact of a change (Terraform-plan style). → `dist/map.js`.
/// `model` is a `{ current, proposed }` BlueprintChoices pair; omitted ⇒ the demo change.
#[tauri::command]
pub async fn impact_preview(
    app: AppHandle,
    backend: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    let mut args = vec![];
    push_opt(&mut args, "--backend", backend);
    push_opt(&mut args, "--model", model);
    run_sidecar(&app, "map.js", args).await
}

/// Project the request-lifecycle / data-flow map of a model. → `dist/flow-map.js`.
/// `model` (a BlueprintChoices JSON) maps a REAL blueprint; omitted ⇒ the demo model.
#[tauri::command]
pub async fn flow_map(
    app: AppHandle,
    backend: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    let mut args = vec![];
    push_opt(&mut args, "--backend", backend);
    push_opt(&mut args, "--model", model);
    run_sidecar(&app, "flow-map.js", args).await
}

/// Detect the toolchains THIS machine has for each backend. → `dist/detect-demo.js`.
/// A SHELL-OUT to the certified `detect/probe.ts` — NOT a Rust re-probe (the thin-invoker
/// thesis supersedes the Phase-1 "Rust probes" intent; a reimplementation would risk drift).
#[tauri::command]
pub async fn detect_toolchains(app: AppHandle) -> Result<String, String> {
    run_sidecar(&app, "detect-demo.js", vec![]).await
}
