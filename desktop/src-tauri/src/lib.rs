// Thraksha desktop shell — Phase 0, Day 5: the Node sidecar bridge.
//
// The generator runs as a BUNDLED sidecar (the pinned node.exe declared in
// tauri.conf.json externalBin), NEVER the system node. On startup the shell
// verifies the sidecar entry exists, spawns the bundled node against the
// resourced generator, captures the emitted digests from stdout, and writes them
// to a temp file so the byte-identical gate can diff them against the frozen
// 43+10+MAXIMAL. No generator source is touched — dist/ + plugins/ ship as
// layout-preserved resources; import.meta.url resolves the templates unchanged.

use tauri::Manager;
use tauri_plugin_shell::ShellExt;

// The local blueprint store (Eco-Day 8, Option A) — SQLite on the shell side; the
// generator stays pure Node. Wired as a module now; a UI drives it later.
pub mod blueprint_store;

/// Where the sidecar's stdout (the 44 DIGEST lines) is written for the gate.
fn digest_out_path() -> std::path::PathBuf {
    std::env::temp_dir().join("thraksha-sidecar-digests.txt")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let handle = app.handle().clone();
            let out_file = digest_out_path();

            // Resolve the resourced generator entry. Resources ship under
            // <resource_dir>/resources/gen/{dist,plugins} (layout preserved), so
            // import.meta.url in day20-regression.js finds ../../../plugins/<stack>/templates.
            let resource_dir = match handle.path().resource_dir() {
                Ok(d) => d,
                Err(e) => {
                    let _ = std::fs::write(&out_file, format!("ERROR: no resource_dir: {e}"));
                    return Ok(());
                }
            };
            let entry = resource_dir
                .join("resources")
                .join("gen")
                .join("dist")
                .join("day20-regression.js");

            // Verify-before-spawn: the sidecar entry must exist. Never fall back
            // to a system node.
            if !entry.exists() {
                let _ = std::fs::write(
                    &out_file,
                    format!("ERROR: sidecar entry not found: {}", entry.display()),
                );
                return Ok(());
            }

            // Node on Windows accepts forward slashes; using them (and stripping any
            // \\?\ verbatim prefix) avoids the arg getting split on backslashes when
            // passed to the sidecar (which truncated the path to "E:").
            let entry_arg = {
                let s = entry.to_string_lossy().to_string();
                let s = s.strip_prefix(r"\\?\").map(|x| x.to_string()).unwrap_or(s);
                s.replace('\\', "/")
            };

            tauri::async_runtime::spawn(async move {
                match handle.shell().sidecar("node") {
                    Ok(cmd) => {
                        let cmd = cmd.arg(entry_arg).arg("--emit-digests");
                        match cmd.output().await {
                            Ok(output) => {
                                // stdout = the DIGEST lines; prepend a header with the
                                // exit code so the gate can confirm a clean run.
                                let mut buf =
                                    format!("SIDECAR_EXIT {:?}\n", output.status.code())
                                        .into_bytes();
                                buf.extend_from_slice(&output.stdout);
                                if !output.stderr.is_empty() {
                                    buf.extend_from_slice(b"\n--- STDERR ---\n");
                                    buf.extend_from_slice(&output.stderr);
                                }
                                let _ = std::fs::write(&out_file, buf);
                            }
                            Err(e) => {
                                let _ = std::fs::write(
                                    &out_file,
                                    format!("ERROR: sidecar spawn failed: {e}"),
                                );
                            }
                        }
                    }
                    Err(e) => {
                        let _ = std::fs::write(
                            &out_file,
                            format!("ERROR: sidecar resolve failed: {e}"),
                        );
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
