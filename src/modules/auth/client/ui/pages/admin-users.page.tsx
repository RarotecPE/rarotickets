import { useState } from 'react';
import { api } from '@client/config/services';
import { useAsync } from '@client/shared/use-async.hook';
import { formatDateTime } from '@client/shared/format';
import { Badge } from '@client/ui/components/badge.component';
import { Button } from '@client/ui/components/button.component';
import { SectionCard } from '@client/ui/components/card.component';
import { DataTable } from '@client/ui/components/data-table.component';
import { CheckboxField, SelectField, TextField } from '@client/ui/components/form-fields.component';
import { Modal } from '@client/ui/components/modal.component';
import { PageHeader } from '@client/ui/components/page-header.component';
import { useToast } from '@client/state/toast.state';
import { ALL_PERMISSIONS, PERMISSION_LABELS, ROLE_DEFAULT_PERMISSIONS } from '@core/domain/permissions';
import type { Permission, UserRole } from '@core/domain/permissions';

const ROLES: UserRole[] = ['ADMINISTRADOR', 'GERENTE_EVENTO', 'FINANCEIRO', 'ATENDIMENTO', 'CHECKIN', 'CONSULTA'];

const ROLE_LABELS: Record<UserRole, string> = {
  ADMINISTRADOR: 'Administrador',
  GERENTE_EVENTO: 'Gestor de evento',
  FINANCEIRO: 'Financeiro',
  ATENDIMENTO: 'Atendimento',
  CHECKIN: 'Check-in',
  CONSULTA: 'Consulta',
};

/** Usuários, perfis e permissões (§35, §36). */
export function AdminUsersPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [isCreating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; role: string; permissions: string[]; isActive: boolean } | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ATENDIMENTO' as UserRole });
  const [customPermissions, setCustomPermissions] = useState<Permission[]>([]);
  const [useCustom, setUseCustom] = useState(false);

  const { data, isLoading, error, reload } = useAsync(() => api.users.list({ search: search || undefined, perPage: 50 }), [search]);

  const handleCreate = async () => {
    try {
      await api.users.create({ ...form, permissions: useCustom ? customPermissions : undefined });
      toast.show({ tone: 'success', title: 'Usuário criado', description: form.email });
      setCreating(false);
      setForm({ name: '', email: '', password: '', role: 'ATENDIMENTO' });
      setCustomPermissions([]);
      setUseCustom(false);
      await reload();
    } catch (caught) {
      toast.show({ tone: 'danger', title: 'Não foi possível criar', description: caught instanceof Error ? caught.message : undefined });
    }
  };

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      await api.users.update({
        userId: editing.id,
        body: {
          name: editing.name,
          role: editing.role,
          permissions: useCustom ? customPermissions : undefined,
          isActive: editing.isActive,
        },
      });
      toast.show({ tone: 'success', title: 'Usuário atualizado' });
      setEditing(null);
      await reload();
    } catch (caught) {
      toast.show({ tone: 'danger', title: 'Falha ao atualizar', description: caught instanceof Error ? caught.message : undefined });
    }
  };

  return (
    <div>
      <PageHeader
        title="Usuários e permissões"
        description="Perfis definem o conjunto padrão de permissões; ajustes finos são permitidos por usuário."
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            Novo usuário
          </Button>
        }
      />

      <SectionCard className="mb-4">
        <TextField
          label="Buscar"
          placeholder="Nome ou e-mail"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </SectionCard>

      {error && <p className="mb-3 text-[13px] text-app-danger">{error}</p>}

      <DataTable
        rows={data?.users ?? []}
        isLoading={isLoading}
        rowKey={(user) => user.id}
        emptyTitle="Nenhum usuário encontrado"
        columns={[
          {
            key: 'name',
            header: 'Usuário',
            primary: true,
            render: (user) => (
              <div>
                <p>{user.name}</p>
                <p className="text-[12px] text-app-muted">{user.email}</p>
              </div>
            ),
          },
          { key: 'role', header: 'Perfil', render: (user) => <Badge tone="primary">{user.roleLabel ?? ROLE_LABELS[user.role as UserRole] ?? user.role}</Badge> },
          { key: 'status', header: 'Situação', render: (user) => (user.isActive ? <Badge tone="success">Ativo</Badge> : <Badge tone="danger">Inativo</Badge>) },
          {
            key: 'permissions',
            header: 'Permissões',
            hideOnMobile: true,
            render: (user) => `${user.permissions.length} permissão(ões)`,
          },
          {
            key: 'lastLogin',
            header: 'Último acesso',
            render: (user) => (user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—'),
          },
          {
            key: 'actions',
            header: 'Ações',
            render: (user) => (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEditing({ id: user.id, name: user.name, role: user.role, permissions: user.permissions, isActive: user.isActive });
                  setCustomPermissions(user.permissions as Permission[]);
                  setUseCustom(true);
                }}
              >
                Editar
              </Button>
            ),
          },
        ]}
      />

      <Modal
        open={isCreating}
        title="Novo usuário"
        description="A senha inicial deve ser trocada no primeiro acesso."
        onClose={() => setCreating(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleCreate()}>Criar</Button>
          </>
        }
      >
        <div className="space-y-3">
          <TextField label="Nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <TextField label="E-mail" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <TextField label="Senha inicial" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          <SelectField
            label="Perfil"
            value={form.role}
            onChange={(event) => {
              const role = event.target.value as UserRole;
              setForm({ ...form, role });
              setCustomPermissions([...(ROLE_DEFAULT_PERMISSIONS[role] ?? [])]);
            }}
            options={ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
          />
          <CheckboxField
            label="Personalizar permissões"
            hint={`Padrão do perfil: ${(ROLE_DEFAULT_PERMISSIONS[form.role] ?? []).length} permissões`}
            checked={useCustom}
            onChange={(event) => {
              setUseCustom(event.target.checked);
              if (event.target.checked && customPermissions.length === 0) {
                setCustomPermissions([...(ROLE_DEFAULT_PERMISSIONS[form.role] ?? [])]);
              }
            }}
          />
          {useCustom && (
            <PermissionPicker value={customPermissions} onChange={setCustomPermissions} />
          )}
        </div>
      </Modal>

      <Modal
        open={editing !== null}
        title="Editar usuário"
        description={editing?.name}
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleUpdate()}>Salvar</Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <TextField label="Nome" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
            <SelectField
              label="Perfil"
              value={editing.role}
              onChange={(event) => setEditing({ ...editing, role: event.target.value })}
              options={ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
            />
            <CheckboxField
              label="Usuário ativo"
              checked={editing.isActive}
              onChange={(event) => setEditing({ ...editing, isActive: event.target.checked })}
            />
            <CheckboxField
              label="Personalizar permissões"
              checked={useCustom}
              onChange={(event) => setUseCustom(event.target.checked)}
            />
            {useCustom && <PermissionPicker value={customPermissions} onChange={setCustomPermissions} />}
          </div>
        )}
      </Modal>
    </div>
  );
}

function PermissionPicker({ value, onChange }: { value: Permission[]; onChange: (value: Permission[]) => void }) {
  return (
    <fieldset className="rounded-[8px] border border-app-border p-3">
      <legend className="px-1 text-[12px] text-app-muted">Permissões ({(value ?? []).length})</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {ALL_PERMISSIONS.map((permission) => (
          <CheckboxField
            key={permission}
            label={PERMISSION_LABELS[permission]}
            checked={value.includes(permission)}
            onChange={(event) =>
              onChange(event.target.checked ? [...value, permission] : value.filter((item) => item !== permission))
            }
          />
        ))}
      </div>
    </fieldset>
  );
}
