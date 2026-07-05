import { useState } from "react";
import {
  ChevronDown,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Zap,
  Check,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  Download,
  Save,
  RotateCcw,
  Clock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldType =
  | "String"
  | "Text"
  | "Integer"
  | "Long"
  | "Decimal"
  | "Boolean"
  | "Date"
  | "DateTime";

interface Field {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
}

interface Entity {
  id: string;
  name: string;
  fields: Field[];
}

interface ProjectConfig {
  name: string;
  type: string;
  backend: string;
  frontend: string;
  database: string;
  multiUser: string;
  auth: string;
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Select({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white border border-[#e2e8f0] text-[#0f172a] text-sm rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none"
      />
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  className = "",
  monospace = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  monospace?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-white border border-[#e2e8f0] text-[#0f172a] text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/30 focus:border-[#2563eb] placeholder:text-[#94a3b8] ${monospace ? "font-mono" : ""} ${className}`}
    />
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">
      {children}
    </label>
  );
}

function BtnPrimary({
  onClick,
  children,
  disabled = false,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white text-sm font-semibold px-4 py-2 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function BtnSecondary({
  onClick,
  children,
}: {
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 bg-white hover:bg-[#f8fafc] border border-[#e2e8f0] text-[#374151] text-sm font-semibold px-4 py-2 rounded-md transition-colors"
    >
      {children}
    </button>
  );
}

// ─── Header + Stepper ─────────────────────────────────────────────────────────

const STEPS = ["Project", "Entities", "Blueprint", "Generated"];

function Header({ step, done }: { step: number; done: boolean }) {
  return (
    <header className="h-14 bg-white border-b border-[#e2e8f0] flex items-center px-6 sticky top-0 z-50">
      <div className="w-full max-w-[1200px] mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#2563eb] flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="text-[15px] font-bold text-[#0f172a] tracking-tight">
            Thraksha
          </span>
        </div>

        {/* Stepper */}
        <nav className="flex items-center gap-0">
          {STEPS.map((label, i) => {
            const num = i + 1;
            const isActive = num === step;
            const isComplete = num < step || (done && num === 4);
            const isLast = i === STEPS.length - 1;
            return (
              <div key={label} className="flex items-center">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                      isComplete
                        ? "bg-[#2563eb] text-white"
                        : isActive
                          ? "bg-[#2563eb] text-white ring-4 ring-[#2563eb]/20"
                          : "bg-[#f1f5f9] text-[#94a3b8]"
                    }`}
                  >
                    {isComplete ? <Check size={10} /> : num}
                  </div>
                  <span
                    className={`text-[13px] font-semibold transition-colors ${
                      isActive
                        ? "text-[#2563eb]"
                        : isComplete
                          ? "text-[#374151]"
                          : "text-[#94a3b8]"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {!isLast && (
                  <div className="w-6 h-px bg-[#e2e8f0] mx-0.5 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </nav>

        <div className="w-32" />
      </div>
    </header>
  );
}

// ─── Screen 1: Project Basics ─────────────────────────────────────────────────

function Screen1({
  config,
  setConfig,
  onNext,
}: {
  config: ProjectConfig;
  setConfig: (c: ProjectConfig) => void;
  onNext: () => void;
}) {
  const set = (key: keyof ProjectConfig) => (v: string) =>
    setConfig({ ...config, [key]: v });

  const loadExample = () => {
    setConfig({
      name: "DemoApp",
      type: "Web App",
      backend: "FastAPI",
      frontend: "React",
      database: "PostgreSQL",
      multiUser: "Yes — multi-user ready",
      auth: "Simple login",
    });
  };

  return (
    <div className="flex-1 flex items-start justify-center pt-12 pb-20 px-6">
      <div className="w-full max-w-[520px]">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight">
            Set up your project
          </h1>
          <p className="text-[#64748b] text-sm mt-1.5">
            Tell us what you&#39;re building.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
          <div className="p-6 space-y-5">
            {/* Project name */}
            <div>
              <Label>Project name</Label>
              <Input
                value={config.name}
                onChange={set("name")}
                placeholder="e.g. DemoApp"
              />
            </div>

            {/* Project type */}
            <div>
              <Label>Project type</Label>
              <Select
                value={config.type}
                onChange={set("type")}
                options={["Web App", "API Service", "Mobile Backend", "CLI Tool"]}
              />
            </div>

            <div className="h-px bg-[#f1f5f9]" />

            {/* Backend */}
            <div>
              <Label>Backend</Label>
              <Select
                value={config.backend}
                onChange={set("backend")}
                options={["FastAPI", "Spring Boot", "Express", "Django"]}
              />
            </div>

            {/* Frontend */}
            <div>
              <Label>Frontend</Label>
              <Select
                value={config.frontend}
                onChange={set("frontend")}
                options={["React", "None"]}
              />
            </div>

            {/* Database */}
            <div>
              <Label>Database</Label>
              <Select
                value={config.database}
                onChange={set("database")}
                options={["PostgreSQL", "None"]}
              />
            </div>

            <div className="h-px bg-[#f1f5f9]" />

            {/* Multi-user */}
            <div>
              <Label>Multi-user</Label>
              <Select
                value={config.multiUser}
                onChange={set("multiUser")}
                options={[
                  "Yes — multi-user ready",
                  "No",
                ]}
              />
            </div>

            {/* Authentication */}
            <div>
              <Label>Authentication</Label>
              <Select
                value={config.auth}
                onChange={set("auth")}
                options={["Simple login", "None"]}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#e2e8f0] flex items-center justify-between">
            <BtnSecondary onClick={loadExample}>Load example</BtnSecondary>
            <BtnPrimary onClick={onNext} disabled={!config.name.trim()}>
              Next <ArrowRight size={14} />
            </BtnPrimary>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 2: Define Entities ────────────────────────────────────────────────

const FIELD_TYPES: FieldType[] = [
  "String",
  "Text",
  "Integer",
  "Long",
  "Decimal",
  "Boolean",
  "Date",
  "DateTime",
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const DEFAULT_ENTITY: Entity = {
  id: uid(),
  name: "Ticket",
  fields: [
    { id: uid(), name: "title", type: "String", required: true, unique: false },
    { id: uid(), name: "code", type: "String", required: false, unique: true },
    { id: uid(), name: "priority", type: "Integer", required: false, unique: false },
  ],
};

function Screen2({
  entities,
  setEntities,
  onBack,
  onNext,
}: {
  entities: Entity[];
  setEntities: (e: Entity[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [draft, setDraft] = useState<Entity>({
    id: uid(),
    name: "",
    fields: [
      { id: uid(), name: "", type: "String", required: false, unique: false },
    ],
  });

  const updateField = (idx: number, patch: Partial<Field>) => {
    setDraft((d) => ({
      ...d,
      fields: d.fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)),
    }));
  };

  const addField = () => {
    setDraft((d) => ({
      ...d,
      fields: [
        ...d.fields,
        { id: uid(), name: "", type: "String", required: false, unique: false },
      ],
    }));
  };

  const removeField = (idx: number) => {
    setDraft((d) => ({
      ...d,
      fields: d.fields.filter((_, i) => i !== idx),
    }));
  };

  const addEntity = () => {
    if (!draft.name.trim()) return;
    setEntities([...entities, { ...draft, id: uid() }]);
    setDraft({
      id: uid(),
      name: "",
      fields: [
        { id: uid(), name: "", type: "String", required: false, unique: false },
      ],
    });
  };

  const allEntities = entities.length > 0 ? entities : [DEFAULT_ENTITY];

  const modelJson = JSON.stringify(
    allEntities.map((e) => ({
      entity: e.name,
      fields: e.fields.map((f) => ({
        name: f.name,
        type: f.type,
        ...(f.required ? { required: true } : {}),
        ...(f.unique ? { unique: true } : {}),
      })),
    })),
    null,
    2
  );

  return (
    <div className="flex-1 flex flex-col items-center pt-12 pb-20 px-6">
      <div className="w-full max-w-[1100px]">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight">
            Define your entities
          </h1>
          <p className="text-[#64748b] text-sm mt-1.5">
            Describe the things your app manages.
          </p>
        </div>

        <div className="grid grid-cols-[1fr_340px] gap-6 items-start">
          {/* Left: entity editor */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#f1f5f9]">
              <Label>Entity name</Label>
              <Input
                value={draft.name}
                onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
                placeholder="e.g. Ticket"
              />
            </div>

            {/* Field rows */}
            <div className="p-5">
              <div className="mb-2 grid grid-cols-[1fr_130px_80px_80px_36px] gap-2 items-center">
                <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">
                  Field name
                </span>
                <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">
                  Type
                </span>
                <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider text-center">
                  Required
                </span>
                <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider text-center">
                  Unique
                </span>
                <span />
              </div>

              <div className="space-y-2">
                {draft.fields.map((field, i) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-[1fr_130px_80px_80px_36px] gap-2 items-center"
                  >
                    <Input
                      value={field.name}
                      onChange={(v) => updateField(i, { name: v })}
                      placeholder="field_name"
                      monospace
                    />
                    <Select
                      value={field.type}
                      onChange={(v) => updateField(i, { type: v as FieldType })}
                      options={FIELD_TYPES}
                    />
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) =>
                          updateField(i, { required: e.target.checked })
                        }
                        className="w-4 h-4 rounded border-[#cbd5e1] accent-[#2563eb] cursor-pointer"
                      />
                    </div>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={field.unique}
                        onChange={(e) =>
                          updateField(i, { unique: e.target.checked })
                        }
                        className="w-4 h-4 rounded border-[#cbd5e1] accent-[#2563eb] cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={() => removeField(i)}
                      className="flex items-center justify-center w-8 h-8 rounded-md text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#fef2f2] transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-[#f1f5f9] flex items-center justify-between">
                <BtnSecondary onClick={addField}>
                  <Plus size={13} /> Add field
                </BtnSecondary>
                <BtnPrimary onClick={addEntity} disabled={!draft.name.trim()}>
                  Add entity
                </BtnPrimary>
              </div>
            </div>

            {/* Added entities list */}
            {entities.length > 0 && (
              <div className="border-t border-[#f1f5f9] px-5 py-4">
                <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">
                  Added entities
                </p>
                <div className="space-y-1.5">
                  {entities.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between py-1.5 px-3 bg-[#f8fafc] rounded-md"
                    >
                      <span className="text-sm font-semibold text-[#0f172a] font-mono">
                        {e.name}
                      </span>
                      <span className="text-xs text-[#64748b]">
                        {e.fields.length} field{e.fields.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: JSON preview */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden sticky top-20">
            <div className="px-4 py-3 border-b border-[#f1f5f9] flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[#374151]">
                Project model
              </span>
              <span className="text-[11px] text-[#94a3b8] font-mono">JSON</span>
            </div>
            <div className="p-4 bg-[#f8fafc] min-h-[280px] overflow-auto">
              <pre className="text-[12px] font-mono text-[#374151] leading-relaxed whitespace-pre-wrap">
                {modelJson}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer nav */}
        <div className="mt-8 flex items-center justify-between">
          <BtnSecondary onClick={onBack}>
            <ArrowLeft size={14} /> Back
          </BtnSecondary>
          <BtnPrimary onClick={onNext}>
            Next <ArrowRight size={14} />
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 3: Blueprint ──────────────────────────────────────────────────────

function EntityBox({ entity }: { entity: Entity }) {
  const colors = [
    { bar: "#2563eb", bg: "#eff6ff", text: "#1d4ed8" },
    { bar: "#7c3aed", bg: "#f5f3ff", text: "#6d28d9" },
    { bar: "#0891b2", bg: "#ecfeff", text: "#0e7490" },
    { bar: "#059669", bg: "#f0fdf4", text: "#047857" },
  ];
  const c = colors[Math.abs(entity.name.charCodeAt(0)) % colors.length];

  return (
    <div
      className="rounded-xl overflow-hidden border border-[#e2e8f0] shadow-sm bg-white w-64 flex-shrink-0"
    >
      {/* Title bar */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ backgroundColor: c.bar }}
      >
        <span className="text-white text-[13px] font-bold tracking-tight">
          {entity.name}
        </span>
      </div>

      {/* Fields */}
      <div className="divide-y divide-[#f1f5f9]">
        {entity.fields.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between px-4 py-2"
          >
            <span className="text-[12px] font-mono text-[#374151]">{f.name}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#64748b] font-mono">{f.type}</span>
              {f.required && (
                <span
                  className="text-[9px] font-bold px-1 py-0.5 rounded"
                  style={{ backgroundColor: c.bg, color: c.text }}
                >
                  REQ
                </span>
              )}
              {f.unique && (
                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[#f0fdf4] text-[#047857]">
                  UNIQUE
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Auto-fields */}
      <div className="px-4 py-2 bg-[#f8fafc] border-t border-[#f1f5f9]">
        <p className="text-[11px] text-[#94a3b8] italic">
          + id, created_at, updated_at, owner — added automatically
        </p>
      </div>
    </div>
  );
}

function Screen3({
  config,
  entities,
  onBack,
  onNext,
}: {
  config: ProjectConfig;
  entities: Entity[];
  onBack: () => void;
  onNext: () => void;
}) {
  const displayEntities =
    entities.length > 0
      ? entities
      : [DEFAULT_ENTITY];

  const chips = [
    { label: "Backend", value: config.backend },
    { label: "Frontend", value: config.frontend },
    { label: "Database", value: config.database },
    {
      label: "Multi-user",
      value: config.multiUser === "Yes — multi-user ready" ? "Yes" : "No",
    },
    { label: "Auth", value: config.auth },
  ];

  return (
    <div className="flex-1 flex flex-col items-center pt-12 pb-20 px-6">
      <div className="w-full max-w-[1100px]">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight">
            Your app blueprint
          </h1>
          <p className="text-[#64748b] text-sm mt-1.5">
            Here&#39;s what will be built.
          </p>
        </div>

        {/* Summary row */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm px-5 py-4 mb-5 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 mr-2">
            <span className="text-[15px] font-bold text-[#0f172a]">
              {config.name || "DemoApp"}
            </span>
            <span className="text-[13px] text-[#64748b]">·</span>
            <span className="text-[13px] text-[#64748b]">{config.type}</span>
          </div>
          <div className="h-4 w-px bg-[#e2e8f0]" />
          <div className="flex items-center gap-2 flex-wrap">
            {chips.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-full border border-[#e2e8f0] bg-[#f8fafc] text-[#374151] font-medium"
              >
                <span className="text-[#94a3b8]">{chip.label}:</span>
                {chip.value}
              </span>
            ))}
          </div>
        </div>

        {/* Diagram canvas */}
        <div
          className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] overflow-x-auto relative"
          style={{
            backgroundImage:
              "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            minHeight: "360px",
          }}
        >
          <div className="p-8 flex items-start gap-8 flex-wrap">
            {displayEntities.map((entity, i) => (
              <div key={entity.id} className="relative flex items-center">
                <EntityBox entity={entity} />
                {i < displayEntities.length - 1 && (
                  <div className="absolute right-[-34px] top-1/2 -translate-y-1/2 w-8 flex items-center">
                    <div className="h-px w-full bg-[#cbd5e1]" />
                    <ChevronRight size={12} className="text-[#94a3b8] -ml-1 flex-shrink-0" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between">
          <BtnSecondary onClick={onBack}>
            <ArrowLeft size={14} /> Back
          </BtnSecondary>
          <BtnPrimary onClick={onNext}>
            <Zap size={14} /> Generate project
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 4: Generated Project ──────────────────────────────────────────────

const FILE_TREE = [
  {
    name: "backend",
    type: "folder",
    children: [
      { name: "server.py", type: "file" },
      { name: "models.py", type: "file" },
      { name: "routes.py", type: "file" },
      { name: "auth.py", type: "file" },
      { name: "database.py", type: "file" },
      { name: "requirements.txt", type: "file" },
    ],
  },
  {
    name: "migrations",
    type: "folder",
    children: [
      { name: "V1__init.sql", type: "file" },
      { name: "V2__tickets.sql", type: "file" },
    ],
  },
  {
    name: "src",
    type: "folder",
    children: [
      { name: "App.tsx", type: "file" },
      { name: "api.ts", type: "file" },
      { name: "types.ts", type: "file" },
    ],
  },
  { name: "package.json", type: "file" },
  { name: "docker-compose.yml", type: "file" },
  { name: "README.md", type: "file" },
];

const FILE_CONTENTS: Record<string, string> = {
  "server.py": `from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, routes, auth
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DemoApp API",
    description="Auto-generated by Thraksha",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(routes.ticket_router, prefix="/api/tickets", tags=["tickets"])

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0.0"}`,

  "V1__init.sql": `-- Thraksha · DemoApp · Initial schema
-- Generated 2026-07-01

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tickets (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title       VARCHAR(255) NOT NULL,
    code        VARCHAR(64)  UNIQUE,
    priority    INTEGER,
    done        BOOLEAN DEFAULT FALSE,
    owner       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_owner ON tickets(owner);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);`,

  "models.py": `from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    tickets = relationship("Ticket", back_populates="owner_user")

class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    code = Column(String(64), unique=True)
    priority = Column(Integer)
    done = Column(Boolean, default=False)
    owner = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    owner_user = relationship("User", back_populates="tickets")`,

  "package.json": `{
  "name": "demoapp-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.0",
    "axios": "^1.4.0",
    "@tanstack/react-query": "^4.32.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.1.6",
    "vite": "^4.4.0",
    "@vitejs/plugin-react": "^4.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}`,
};

const VERSIONS = [
  { label: "v3 · Current", time: "Just now", current: true },
  { label: "v2 · Before auth", time: "2 min ago", current: false },
  { label: "v1 · Initial", time: "5 min ago", current: false },
];

type TreeNode = {
  name: string;
  type: string;
  children?: TreeNode[];
};

function FileTreeNode({
  node,
  depth,
  selected,
  onSelect,
  path,
}: {
  node: TreeNode;
  depth: number;
  selected: string;
  onSelect: (path: string) => void;
  path: string;
}) {
  const [open, setOpen] = useState(depth === 0);
  const fullPath = path ? `${path}/${node.name}` : node.name;
  const isSelected = selected === fullPath;

  if (node.type === "folder") {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-md hover:bg-[#f1f5f9] transition-colors"
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          {open ? (
            <FolderOpen size={13} className="text-[#f59e0b] flex-shrink-0" />
          ) : (
            <Folder size={13} className="text-[#f59e0b] flex-shrink-0" />
          )}
          <span className="text-[12px] font-medium text-[#374151]">
            {node.name}
          </span>
        </button>
        {open &&
          node.children?.map((child) => (
            <FileTreeNode
              key={child.name}
              node={child}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
              path={fullPath}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(fullPath)}
      className={`flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-md transition-colors ${
        isSelected
          ? "bg-[#eff6ff] text-[#2563eb]"
          : "hover:bg-[#f8fafc] text-[#374151]"
      }`}
      style={{ paddingLeft: `${8 + depth * 14}px` }}
    >
      <File size={12} className={isSelected ? "text-[#2563eb]" : "text-[#94a3b8]"} />
      <span className="text-[12px] font-medium">{node.name}</span>
    </button>
  );
}

function Screen4({
  config,
  entities,
  onBack,
}: {
  config: ProjectConfig;
  entities: Entity[];
  onBack: () => void;
}) {
  const [selectedFile, setSelectedFile] = useState("backend/server.py");
  const [currentVersion, setCurrentVersion] = useState(0);

  const fileName = selectedFile.split("/").pop() || selectedFile;
  const fileContent = FILE_CONTENTS[fileName] || `-- No preview available for ${fileName}`;
  const displayName = config.name || "DemoApp";
  const backendLabel = config.backend || "FastAPI";
  const dbLabel = config.database || "PostgreSQL";
  const entityCount = Math.max(entities.length, 1);
  const fileCount = 33;

  return (
    <div className="flex-1 flex flex-col items-center pt-12 pb-20 px-6">
      <div className="w-full max-w-[1100px]">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0f172a] tracking-tight">
              🎉 Your project is generated
            </h1>
            <p className="text-[#64748b] text-sm mt-1.5">
              Browse your real, working code.
            </p>
          </div>
        </div>

        {/* Success banner */}
        <div className="flex items-center gap-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-5 py-3.5 mb-5">
          <div className="w-6 h-6 rounded-full bg-[#22c55e] flex items-center justify-center flex-shrink-0">
            <Check size={13} className="text-white" />
          </div>
          <p className="text-[13px] font-medium text-[#166534]">
            Generated {fileCount} files — {displayName} ({backendLabel} + {dbLabel}).
            Ready to run.
          </p>
          <div className="ml-auto flex items-center gap-2 text-[12px] text-[#16a34a]">
            <span>{entityCount} entit{entityCount === 1 ? "y" : "ies"}</span>
            <span>·</span>
            <span>{fileCount} files</span>
          </div>
        </div>

        {/* Versions + viewer row */}
        <div className="grid grid-cols-[200px_1fr_220px] gap-4 items-start">
          {/* File tree */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            <div className="px-3 py-2.5 border-b border-[#f1f5f9]">
              <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">
                Files
              </span>
            </div>
            <div className="py-1.5 max-h-[480px] overflow-y-auto">
              {FILE_TREE.map((node) => (
                <FileTreeNode
                  key={node.name}
                  node={node}
                  depth={0}
                  selected={selectedFile}
                  onSelect={setSelectedFile}
                  path=""
                />
              ))}
            </div>
          </div>

          {/* Code panel */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            {/* Filename bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#f1f5f9] bg-[#f8fafc]">
              <File size={12} className="text-[#94a3b8]" />
              <span className="text-[12px] font-mono font-medium text-[#374151]">
                {selectedFile}
              </span>
            </div>
            {/* Code */}
            <div className="overflow-auto" style={{ maxHeight: "480px" }}>
              <pre className="p-5 text-[12px] font-mono text-[#334155] leading-relaxed whitespace-pre overflow-x-auto">
                <code>{fileContent}</code>
              </pre>
            </div>
          </div>

          {/* Versions panel */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#f1f5f9]">
              <span className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider">
                Versions
              </span>
            </div>
            <div className="p-3 border-b border-[#f1f5f9]">
              <button className="flex items-center gap-2 w-full bg-[#eff6ff] hover:bg-[#dbeafe] border border-[#bfdbfe] text-[#2563eb] text-[12px] font-semibold px-3 py-2 rounded-md transition-colors">
                <Save size={12} /> Save version
              </button>
            </div>
            <div className="divide-y divide-[#f8fafc]">
              {VERSIONS.map((v, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentVersion(i)}
                  className={`w-full text-left px-4 py-3 hover:bg-[#f8fafc] transition-colors ${
                    currentVersion === i ? "bg-[#f8fafc]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[12px] font-semibold ${
                        v.current ? "text-[#2563eb]" : "text-[#374151]"
                      }`}
                    >
                      {v.label}
                    </span>
                    {v.current && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#eff6ff] text-[#2563eb]">
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock size={10} className="text-[#94a3b8]" />
                    <span className="text-[11px] text-[#94a3b8]">{v.time}</span>
                  </div>
                </button>
              ))}
            </div>
            {currentVersion > 0 && (
              <div className="p-3 border-t border-[#f1f5f9]">
                <button className="flex items-center gap-2 w-full text-[#64748b] hover:text-[#374151] text-[12px] font-medium px-3 py-2 rounded-md hover:bg-[#f8fafc] transition-colors border border-[#e2e8f0]">
                  <RotateCcw size={12} /> Roll back
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-between">
          <BtnSecondary onClick={onBack}>
            <ArrowLeft size={14} /> Back
          </BtnSecondary>
          <BtnPrimary>
            <Download size={14} /> Download / Open project
          </BtnPrimary>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<ProjectConfig>({
    name: "",
    type: "Web App",
    backend: "FastAPI",
    frontend: "React",
    database: "PostgreSQL",
    multiUser: "Yes — multi-user ready",
    auth: "Simple login",
  });
  const [entities, setEntities] = useState<Entity[]>([]);

  return (
    <div
      className="min-h-screen flex flex-col bg-[#f8fafc]"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <Header step={step} done={step === 4} />

      {step === 1 && (
        <Screen1
          config={config}
          setConfig={setConfig}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <Screen2
          entities={entities}
          setEntities={setEntities}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <Screen3
          config={config}
          entities={entities}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}
      {step === 4 && (
        <Screen4
          config={config}
          entities={entities}
          onBack={() => setStep(3)}
        />
      )}
    </div>
  );
}
