// Thraksha desktop shell — the blueprint-store command surface (Eco-Day 63).
//
// These commands persist the wizard's blueprint so Bedrock KEEPS projects. They are
// deliberately KEPT SEPARATE from commands.rs (the sidecar thin-invokers) because they are
// a DIFFERENT KIND of operation: SHELL-SIDE, IN-PROCESS SQLite storage — NOT a bundled-node
// sidecar spawn. So they return a plain `Result<T, String>` (a storage error = Err; success
// = Ok(data)), NOT the Day-53 `SidecarResult { stdout, stderr, exit_code }` — there is no
// process exit code for an in-proc DB call, and forcing that shape would be dishonest.
//
// There is NO generation logic here: the store round-trips the canonical BlueprintChoices
// JSON verbatim (blueprint_store.rs proves byte-identity); the certified generator is never
// touched. The blueprint bytes the wizard/CLI/--model use are exactly what is stored + loaded.

use crate::blueprint_store::{BlueprintMeta, BlueprintStore};
use tauri::{AppHandle, Manager};

/// Resolve the per-user store file (`%APPDATA%/com.thraksha.bedrock/bedrock-blueprints.sqlite`
/// on Windows) and open it, creating the app-data dir on first use. Every storage error maps
/// to a String (the honest Err channel).
fn open_store(app: &AppHandle) -> Result<BlueprintStore, String> {
    let dir = app.path().app_data_dir().map_err(|e| format!("no app_data_dir: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("create app_data_dir: {e}"))?;
    let db = dir.join("bedrock-blueprints.sqlite");
    let path = db.to_str().ok_or_else(|| "store path is not valid UTF-8".to_string())?;
    BlueprintStore::open(path).map_err(|e| e.to_string())
}

/// Save a blueprint (the canonical BlueprintChoices JSON) under `name`. → the new row id.
#[tauri::command]
pub fn save_blueprint(app: AppHandle, name: String, model_json: String) -> Result<i64, String> {
    open_store(&app)?.save(&name, &model_json).map_err(|e| e.to_string())
}

/// Load a saved blueprint's canonical JSON by row id (verbatim bytes — byte-identical to saved).
#[tauri::command]
pub fn load_blueprint(app: AppHandle, id: i64) -> Result<String, String> {
    open_store(&app)?.load(id).map_err(|e| e.to_string())
}

/// List saved projects (id, name, created_at — newest first) for the "My projects" picker.
#[tauri::command]
pub fn list_blueprints(app: AppHandle) -> Result<Vec<BlueprintMeta>, String> {
    open_store(&app)?.list().map_err(|e| e.to_string())
}
