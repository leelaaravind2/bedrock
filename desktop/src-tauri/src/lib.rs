// Thraksha desktop shell — Phase 0, Day 5: the Node sidecar bridge.
//
// The generator runs as a BUNDLED sidecar (the pinned node.exe declared in
// tauri.conf.json externalBin), NEVER the system node. On startup the shell
// verifies the sidecar entry exists, spawns the bundled node against the
// resourced generator, captures the emitted digests from stdout, and writes them
// to a temp file so the byte-identical gate can diff them against the frozen
// 43+10+MAXIMAL. No generator source is touched — dist/ + plugins/ ship as
// layout-preserved resources; import.meta.url resolves the templates unchanged.

// The local blueprint store (Eco-Day 8, Option A) — SQLite on the shell side; the
// generator stays pure Node. Now driven by the Eco-Day 63 store commands below.
pub mod blueprint_store;

// The command surface (Eco-Day 52) — the Phase-4 generator surfaces + detect, exposed as
// THIN INVOKERS of the bundled-node sidecar (no generation logic in Rust). run_sidecar is
// the shared spawn/capture primitive; the setup() self-test below goes through it too.
pub mod commands;

// The blueprint-store commands (Eco-Day 63) — SHELL-SIDE SQLite persistence (save/load/list).
// Kept SEPARATE from commands.rs: these are in-proc storage ops (Result<T, String>), NOT
// sidecar spawns (SidecarResult). Additive — they do not touch run_sidecar or the self-test.
pub mod store_commands;

/// Where the sidecar's stdout (the 44 DIGEST lines) is written for the gate.
fn digest_out_path() -> std::path::PathBuf {
    std::env::temp_dir().join("thraksha-sidecar-digests.txt")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        // The Phase-4 command surface (Eco-Day 52) — thin invokers of the bundled-node
        // generator. Additive; it does not disturb the startup self-test below.
        .invoke_handler(tauri::generate_handler![
            commands::export_project,
            commands::scan_project,
            commands::impact_preview,
            commands::flow_map,
            commands::flow_svg,
            commands::detect_toolchains,
            // Eco-Day 63 — shell-side blueprint store (additive; separate from the invokers above).
            store_commands::save_blueprint,
            store_commands::load_blueprint,
            store_commands::list_blueprints,
        ])
        .setup(|app| {
            // Startup self-test (Eco-Day 9, load-bearing): run the digest emitter through
            // the SAME run_sidecar primitive the commands use, and write the 103 DIGEST
            // lines to a temp file so the byte-identical gate can diff them against the
            // frozen baseline. The header preserves the Day-5 SIDECAR_EXIT contract —
            // now TRUTHFUL (Eco-Day 53): it prints the REAL exit code from the structured
            // result ({:?} on Some(0) == the exact prior passing header, byte-identical),
            // so a non-zero emitter exit can no longer masquerade as success.
            let handle = app.handle().clone();
            let out_file = digest_out_path();
            tauri::async_runtime::spawn(async move {
                let buf = match commands::run_sidecar(
                    &handle,
                    "day20-regression.js",
                    vec!["--emit-digests".to_string()],
                )
                .await
                {
                    Ok(r) => format!("SIDECAR_EXIT {:?}\n{}", r.exit_code, r.stdout),
                    Err(e) => format!("ERROR: {e}"),
                };
                let _ = std::fs::write(&out_file, buf);
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
