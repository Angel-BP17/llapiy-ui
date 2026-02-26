import { useEffect, useMemo, useState } from "react";
import { AuthService } from "@/services/AuthService";
import { defaultAvatar } from "@/components/users/users-types";
import { config } from "@/config/llapiy-config";
import { Modal } from "@/components/ui/modal";
import { 
  User, 
  Mail, 
  Shield, 
  Building2, 
  Fingerprint, 
  BadgeCheck,
  Calendar,
  Lock,
  ChevronRight
} from "lucide-react";

// Mapeo de nombres amigables para módulos
const moduleLabels: Record<string, string> = {
  "users": "Gestión de Usuarios",
  "roles": "Roles y Seguridad",
  "permissions": "Permisos del Sistema",
  "documents": "Documentos Digitales",
  "blocks": "Bloques de Archivos",
  "areas": "Áreas y Oficinas",
  "group-types": "Tipos de Grupos",
  "groups": "Grupos de Trabajo",
  "subgroups": "Subgrupos / Unidades",
  "document-types": "Tipos de Documento",
  "campos": "Campos de Metadatos",
  "sections": "Secciones de Almacén",
  "andamios": "Andamios / Estantería",
  "boxes": "Cajas de Archivo",
  "activity-logs": "Registro de Auditoría",
  "inbox": "Bandeja de Entrada",
  "notifications": "Notificaciones",
  "clear-system": "Mantenimiento"
};

// Mapeo de nombres amigables para acciones
const actionLabels: Record<string, string> = {
  "view": "Ver listado y detalles",
  "index": "Ver listado principal",
  "create": "Crear nuevo registro",
  "update": "Editar / Actualizar",
  "delete": "Eliminar registros",
  "upload": "Subir archivos / documentos",
  "receive": "Recibir alertas",
  "pdf": "Exportar a PDF",
  "clear-system": "Limpiar datos del sistema"
};

export default function ProfileModule() {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPermsModalOpen, setIsPermsModalOpen] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response: any = await AuthService.getMe();
        const data = response?.user || response;
        setProfile(data);
      } catch (error) {
        console.error("[ProfileModule] Error al cargar perfil:", error);
      } finally {
        setIsLoading(false);
      }
    };
    void loadProfile();
  }, []);

  const groupedPermissions = useMemo(() => {
    if (!profile?.permissions) return {};
    
    const groups: Record<string, string[]> = {};
    
    profile.permissions.forEach((perm: string) => {
      let [module, action] = perm.split(".");
      
      // Manejar permisos sin punto (ej. clear-system)
      if (!action) {
        action = module;
        module = "clear-system";
      }

      if (!groups[module]) groups[module] = [];
      groups[module].push(action);
    });

    return groups;
  }, [profile]);

  const userPhoto = profile?.foto_perfil 
    ? `${config.webUrl}/storage/${profile.foto_perfil}` 
    : defaultAvatar;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header - Siempre visible tras la hidratación inicial */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700" />
        <div className="px-6 pb-6">
          <div className="relative -mt-16 flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
            <div className="h-32 w-32 rounded-2xl border-4 border-card bg-card overflow-hidden shadow-md">
              {isLoading ? (
                <div className="h-full w-full animate-pulse bg-muted" />
              ) : (
                <img
                  src={userPhoto}
                  alt={profile?.name}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="mt-4 flex-1 text-center sm:mb-2 sm:text-left">
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-8 w-48 animate-pulse rounded bg-muted mx-auto sm:mx-0" />
                  <div className="h-4 w-24 animate-pulse rounded bg-muted mx-auto sm:mx-0" />
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-foreground">
                    {profile?.name} {profile?.last_name}
                  </h2>
                  <p className="text-sm text-muted-foreground">@{profile?.user_name}</p>
                </>
              )}
            </div>
            <div className="mt-4 sm:mb-2 flex flex-col gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <BadgeCheck className="h-3.5 w-3.5" />
                Cuenta verificada
              </span>
              <button 
                onClick={() => setIsPermsModalOpen(true)}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              >
                <Lock className="h-3.5 w-3.5" />
                Ver mis permisos
              </button>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : profile ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Fingerprint className="h-4 w-4" />
                Información de la cuenta
              </h3>
              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-muted p-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nombres y apellidos</p>
                    <p className="text-sm font-medium text-foreground">{profile.name} {profile.last_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-muted p-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Correo electrónico</p>
                    <p className="text-sm font-medium text-foreground">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-muted p-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">DNI / Identificación</p>
                    <p className="text-sm font-medium text-foreground">{profile.dni || "No registrado"}</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Shield className="h-4 w-4" />
                Rol y Organización
              </h3>
              <div className="mt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-muted p-2 text-muted-foreground">
                    <BadgeCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Rol principal</p>
                    <p className="text-sm font-medium text-foreground">
                      {Array.isArray(profile.roles) ? profile.roles.join(", ") : "Sin rol asignado"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg bg-muted p-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Área / Organización</p>
                    <p className="text-sm font-medium text-foreground">{profile.area || "Sin área"}</p>
                    <p className="text-xs text-muted-foreground">{profile.group} / {profile.subgroup}</p>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          No se pudo cargar la información del perfil.
        </div>
      )}

      <Modal 
        open={isPermsModalOpen} 
        onClose={() => setIsPermsModalOpen(false)} 
        title="Mis Permisos y Capacidades"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            A continuación se listan las acciones que tienes permitidas en el sistema, agrupadas por módulo de trabajo.
          </p>
          
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(groupedPermissions).map(([module, actions]) => (
              <div key={module} className="rounded-xl border border-border bg-background p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-3 border-b border-border pb-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <h4 className="text-sm font-bold text-foreground">
                    {moduleLabels[module] || module.toUpperCase()}
                  </h4>
                </div>
                <ul className="space-y-2 flex-1">
                  {(actions as string[]).map((action) => (
                    <li key={action} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-primary/60" />
                      <span>{actionLabels[action] || action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {!Object.keys(groupedPermissions).length && (
            <div className="text-center py-10">
              <Lock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground italic">No se encontraron permisos detallados para esta cuenta.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
