import { Trash2 } from "lucide-react";

export type SubgroupRecord = {
  id: number;
  group_id: number;
  descripcion: string;
  abreviacion: string;
  parent_subgroup_id: number | null;
};

export function subgroupTree(groupId: number, subgroups: SubgroupRecord[]) {
  const byParent = new Map<number | null, SubgroupRecord[]>();
  subgroups
    .filter((item) => item.group_id === groupId)
    .forEach((item) => {
      const list = byParent.get(item.parent_subgroup_id) ?? [];
      list.push(item);
      byParent.set(item.parent_subgroup_id, list);
    });
  return byParent;
}

export function SubgroupTreeView({
  parentId,
  tree,
  onDelete
}: {
  parentId: number | null;
  tree: Map<number | null, SubgroupRecord[]>;
  onDelete: (id: number) => void;
}) {
  const items = tree.get(parentId) ?? [];
  if (!items.length) return null;

  return (
    <ul className="mt-2 space-y-2 border-l border-border pl-3">
      {items.map((item) => (
        <li key={item.id}>
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-xs">
            <span className="font-semibold text-foreground">{item.descripcion}</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{item.abreviacion}</span>
            <button type="button" onClick={() => onDelete(item.id)} className="ml-auto inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[10px] font-semibold text-white">
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </button>
          </div>
          <SubgroupTreeView parentId={item.id} tree={tree} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  );
}
