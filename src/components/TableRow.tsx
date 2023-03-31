import {flexRender, Row} from "@tanstack/solid-table";
import {Accessor, createMemo, createSignal, For, Show} from "solid-js";
import type {IRepoBook, IRepoChapter} from "src/customTypes";
type TableRowProps = {
  row: Row<IRepoBook> | Row<IRepoChapter> | Row<unknown>;
};
export function TableRow(props: TableRowProps) {
  return (
    <>
      <tr class="">
        <For each={props.row.getVisibleCells()}>
          {(cell) => (
            <td class="p-1 border-b border-black">
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          )}
        </For>
      </tr>
    </>
  );
}
