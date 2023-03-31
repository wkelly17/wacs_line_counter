import {
  flexRender,
  getCoreRowModel,
  createSolidTable,
  createColumnHelper,
  SortingState,
  getSortedRowModel,
  Row,
  CellContext,
} from "@tanstack/solid-table";
import remarkHtml from "remark-html";
import remarkParse from "remark-parse";
import {unified} from "unified";
import {createMemo, createSignal, For, Show} from "solid-js";
import type {IRepoBucket, IRepoVerse} from "src/customTypes";
import {TableRow} from "./TableRow";
import {Icon} from "./Icon";
import {setHtmlPreview} from "../sharedSignals";

type VerseTableProps = {
  verseList: IRepoVerse[];
  colsByRepoBranch: IRepoBucket;
  chapNum: string;
  bookName: string;
};

export function VerseTable(props: VerseTableProps) {
  const [data, setData] = createSignal(Object.values(props.verseList));
  const [sorting, setSorting] = createSignal<SortingState>([]);
  // the changing columns seems to reset expanded state, so manually track rows here
  const [expandedRows, setExpandedRows] = createSignal<string[]>([]);

  const columnHelper = createColumnHelper<IRepoVerse>();
  const addlCols = createMemo(() => {
    const arr = props.colsByRepoBranch.map((repo) => {
      return columnHelper.group({
        header: repo.repoName,
        columns: repo.branches.map((branch) => {
          return columnHelper.accessor(
            (verseRow) => {
              const mb = branch.data.find(
                (book) =>
                  book.name.toUpperCase() == props.bookName.toUpperCase()
              );
              const mc =
                mb && mb.chapters.find((chap) => chap.chapNum == props.chapNum);

              const matchingVerse =
                mc &&
                mc.verses.find((verse) => verse.verseNum == verseRow.verseNum);
              return matchingVerse?.verseLineCount;
            },
            {
              cell(verse) {
                return (
                  <>
                    <span class="inline-flex gap-2 items-center">
                      <span>{String(verse.getValue())}</span>
                      <button
                        onClick={() => {
                          renderPreviewPaneHtml(verse);
                        }}
                      >
                        <span class="i-mdi-eye-plus block h-5 w-5 hover:text-green-400">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                          >
                            <path
                              fill="currentColor"
                              d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5c.36 0 .72 0 1.08-.05a6.09 6.09 0 0 1-.08-.95c0-.56.08-1.12.24-1.66c-.41.1-.82.16-1.24.16a5 5 0 0 1-5-5a5 5 0 0 1 5-5a5 5 0 0 1 5 5c0 .29-.03.59-.08.88c.66-.25 1.37-.38 2.08-.38c1.17 0 2.31.34 3.29 1c.27-.5.51-1 .71-1.5c-1.73-4.39-6-7.5-11-7.5M12 9a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3m6 5.5v3h-3v2h3v3h2v-3h3v-2h-3v-3h-2Z"
                            />
                          </svg>
                        </span>
                      </button>
                      <a href={getExternalHref(verse)}>
                        <span class="block i-mdi-link-variant h-5 w-5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                          >
                            <path
                              fill="currentColor"
                              d="M10.59 13.41c.41.39.41 1.03 0 1.42c-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0a5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24a2.982 2.982 0 0 0-4.24 0l-3.53 3.53a2.982 2.982 0 0 0 0 4.24m2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0a5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24a2.982 2.982 0 0 0 4.24 0l3.53-3.53a2.982 2.982 0 0 0 0-4.24a.973.973 0 0 1 0-1.42Z"
                            />
                          </svg>
                        </span>
                      </a>
                    </span>
                  </>
                );
              },
              header: branch.branchName,
              id: `${repo.repoName}-${branch.branchName}`,
            }
          );
        }),
      });
    });
    return arr;
  });
  function getExternalHref(verse: CellContext<IRepoVerse, any>) {
    const base =
      "https://content.bibletranslationtools.org/WycliffeAssociates/en_tn/src/branch/master/oba/01/02.md";
    const repoKey = verse.column.parent?.id;
    const branchName = verse.column.columnDef.header;
    const ogVerse = verse.row.original;
    const book = ogVerse.bookName.toLowerCase();
    const chap = ogVerse.chapParent;
    const baseUrl = `https://content.bibletranslationtools.org/WycliffeAssociates/${repoKey}/src/branch/${branchName}/${book}/${chap}/${ogVerse.verseNum}`;
    return baseUrl;
  }
  async function renderPreviewPaneHtml(verse: CellContext<IRepoVerse, any>) {
    // traverse all data using table / row to make it correspond to cell.
    const repoKey = verse.column.parent?.id;
    const branchName = verse.column.columnDef.header;
    let matchingRepo = props.colsByRepoBranch.find(
      (repo) => repo.repoName == repoKey
    );
    let matchingBranch =
      matchingRepo &&
      matchingRepo.branches.find((branch) => branch.branchName == branchName);
    let matchingBook =
      matchingBranch &&
      matchingBranch.data.find(
        (book) => book.name == verse.row.original.bookName
      );
    let matchingChap =
      matchingBook &&
      matchingBook.chapters.find(
        (chap) => chap.chapNum == verse.row.original.chapParent
      );
    let matchingVerse =
      matchingChap &&
      matchingChap.verses.find(
        (vs) => vs.verseNum === verse.row.original.verseNum
      );
    const html = await unified()
      .use(remarkParse)
      .use(remarkHtml)
      .process(String(matchingVerse?.content));
    const htmlString = String(html.value);
    setHtmlPreview(htmlString);
  }
  const columns = [
    columnHelper.accessor("verseNum", {
      cell: (verse) => {
        return verse.row.getCanExpand() ? (
          <button
            onClick={() => {
              // add if not present in arr of expandeds, or remove if so.
              if (expandedRows().includes(verse.row.id)) {
                setExpandedRows(
                  expandedRows().filter((row) => row != verse.row.id)
                );
              } else {
                setExpandedRows((prev) => [...prev, verse.row.id]);
              }
            }}
            class="cursor-pointer inline-flex items-center gap-1"
          >
            {expandedRows().includes(verse.row.id) ? (
              <span>
                <svg
                  class="arr-down inline-block"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M11 4h2v12l5.5-5.5l1.42 1.42L12 19.84l-7.92-7.92L5.5 10.5L11 16V4Z"
                  />
                </svg>
                {verse.getValue()}
              </span>
            ) : (
              <span>
                {verse.getValue()}
                <svg
                  class="arr-right inline-block"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                >
                  <path
                    fill="currentColor"
                    d="M4 15V9h8V4.16L19.84 12L12 19.84V15H4Z"
                  />
                </svg>
              </span>
            )}
          </button>
        ) : (
          verse.getValue()
        );
      },
      header: "Verse Number",
    }),
    ...addlCols(),
  ];
  const table = () =>
    createSolidTable({
      get data() {
        return data();
      },
      state: {
        get sorting() {
          return sorting();
        },
      },
      onSortingChange: setSorting,
      getSortedRowModel: getSortedRowModel(),
      getCoreRowModel: getCoreRowModel(),
      columns: columns,
      // debugTable: true,
    });

  return (
    <div class="w-full pl-4">
      <table class="w-full">
        <thead class="m-0  border-b border-b-black">
          <For each={table().getHeaderGroups()}>
            {(headerGroup) => (
              <tr>
                <For each={headerGroup.headers}>
                  {(header) => (
                    <th class="pr-4  bg-gray-300" colSpan={header.colSpan}>
                      <Show when={!header.isPlaceholder}>
                        <div
                          class={
                            header.column.getCanSort()
                              ? "cursor-pointer select-none"
                              : undefined
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: " 🔼",
                            desc: " 🔽",
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      </Show>
                    </th>
                  )}
                </For>
              </tr>
            )}
          </For>
        </thead>
        <tbody>
          <For each={table().getRowModel().rows}>
            {(row) => (
              <>
                <TableRow row={row} />
              </>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
