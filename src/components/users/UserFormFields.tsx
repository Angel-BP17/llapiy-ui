import type { ChangeEvent } from "react";
import type { UserForm, AreaOption, GroupTypeOption, GroupOption, SimpleOption, RoleOption } from "./users-types";
import { defaultAvatar } from "./users-types";

type UserFormFieldsProps = {
  form: UserForm;
  onChange: (field: keyof UserForm, value: string) => void;
  onToggleRole: (role: string) => void;
  areaOptions: AreaOption[];
  groupTypeOptions: GroupTypeOption[];
  groupOptions: GroupOption[];
  subgroupOptions: SimpleOption[];
  roleOptions: RoleOption[];
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  submitLabel: string;
  errorMessage: string;
};

export function UserFormFields({
  form,
  onChange,
  onToggleRole,
  areaOptions,
  groupTypeOptions,
  groupOptions,
  subgroupOptions,
  roleOptions,
  onImageChange,
  submitLabel,
  errorMessage,
}: UserFormFieldsProps) {
  return (
    <div className="space-y-5">
      {errorMessage ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="rounded-xl border border-border bg-background p-4 lg:col-span-4">
          <h4 className="text-sm font-semibold text-foreground">
            Foto de perfil
          </h4>
          <div className="mt-4 flex flex-col items-center gap-3">
            <img
              src={form.foto || defaultAvatar}
              alt="Foto de perfil"
              className="h-32 w-32 rounded-full border border-border object-cover"
            />
            <input
              type="file"
              accept="image/*"
              onChange={onImageChange}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background p-4 lg:col-span-8">
          <h4 className="text-sm font-semibold text-foreground">
            Datos personales
          </h4>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                onChange("name", event.target.value.toUpperCase())
              }
              placeholder="Nombres"
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
            />
            <input
              type="text"
              value={form.last_name}
              onChange={(event) =>
                onChange("last_name", event.target.value.toUpperCase())
              }
              placeholder="Apellidos"
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
            />
            <input
              type="text"
              value={form.dni}
              onChange={(event) => onChange("dni", event.target.value)}
              placeholder="DNI"
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
            />
          </div>

          <h4 className="mt-5 text-sm font-semibold text-foreground">Cuenta</h4>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input
              type="text"
              value={form.user_name}
              onChange={(event) =>
                onChange("user_name", event.target.value.toUpperCase())
              }
              placeholder="Usuario"
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
            />
            <input
              type="email"
              value={form.email}
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="Correo"
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
            />
            <input
              type="password"
              value={form.password}
              onChange={(event) => onChange("password", event.target.value)}
              placeholder="Contrasena"
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
            />
            <input
              type="password"
              value={form.password_confirmation}
              onChange={(event) =>
                onChange("password_confirmation", event.target.value)
              }
              placeholder="Confirmar contrasena"
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
            />
          </div>

          <h4 className="mt-5 text-sm font-semibold text-foreground">Roles</h4>
          <div className="mt-2 flex flex-wrap gap-3">
            {roleOptions.map((role) => (
              <label
                key={role.name}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground"
              >
                <input
                  type="checkbox"
                  checked={form.roles.includes(role.name)}
                  onChange={() => onToggleRole(role.name)}
                  className="h-4 w-4 rounded border-border"
                />
                {role.label}
              </label>
            ))}
          </div>

          <h4 className="mt-5 text-sm font-semibold text-foreground">
            Organizacion
          </h4>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <select
              value={form.areaId}
              onChange={(event) => onChange("areaId", event.target.value)}
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm"
            >
              <option value="">Seleccione un area</option>
              {areaOptions.map((area) => (
                <option key={area.id} value={String(area.id)}>
                  {area.descripcion}
                </option>
              ))}
            </select>

            <select
              value={form.groupTypeId}
              onChange={(event) => onChange("groupTypeId", event.target.value)}
              disabled={!form.areaId}
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm disabled:opacity-60"
            >
              <option value="">Seleccione un tipo de grupo</option>
              {groupTypeOptions.map((groupType) => (
                <option key={groupType.id} value={String(groupType.id)}>
                  {groupType.descripcion}
                </option>
              ))}
            </select>

            <select
              value={form.groupId}
              onChange={(event) => onChange("groupId", event.target.value)}
              disabled={!form.groupTypeId}
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm disabled:opacity-60"
            >
              <option value="">Seleccione un grupo</option>
              {groupOptions.map((group) => (
                <option key={group.id} value={String(group.id)}>
                  {group.descripcion}
                </option>
              ))}
            </select>

            <select
              value={form.subgroupId}
              onChange={(event) => onChange("subgroupId", event.target.value)}
              disabled={!form.groupId}
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm disabled:opacity-60"
            >
              <option value="">Seleccione un subgrupo</option>
              {subgroupOptions.map((subgroup) => (
                <option key={subgroup.id} value={String(subgroup.id)}>
                  {subgroup.descripcion}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
