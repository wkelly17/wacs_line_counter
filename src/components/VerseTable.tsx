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
                        <Icon className="i-mdi-eye-plus block h-5 w-5 hover:text-green-400" />
                      </button>
                      <a href={getExternalHref(verse)}>
                        <Icon className="block i-mdi-link-variant h-5 w-5" />
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
              <Icon className="i-mdi-arrow-down-bold" text={verse.getValue()} />
            ) : (
              <Icon
                className="i-mdi-arrow-right-bold"
                text={verse.getValue()}
              />
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
