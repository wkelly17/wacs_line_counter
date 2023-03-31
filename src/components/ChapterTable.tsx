import {
  flexRender,
  getCoreRowModel,
  createSolidTable,
  createColumnHelper,
  SortingState,
  getSortedRowModel,
  getExpandedRowModel,
  Row,
} from "@tanstack/solid-table";
import {createMemo, createSignal, For, Show} from "solid-js";
import type {IRepoBucket, IRepoChapter, IRepoVerse} from "@customTypes";
import {TableRow} from "@components/TableRow";
import {Icon} from "@components/Icon";
import {VerseTable} from "@components/VerseTable";

type ChapterTableProps = {
  bookList: IRepoChapter[];
  colsByRepoBranch: IRepoBucket;
  bookName: string;
};

export function ChapterTable(props: ChapterTableProps) {
  const [data, setData] = createSignal(Object.values(props.bookList));
  const [sorting, setSorting] = createSignal<SortingState>([]);
  // the changing columns seems to reset expanded state, so manually track rows here
  const [expandedRows, setExpandedRows] = createSignal<string[]>([]);

  const columnHelper = createColumnHelper<IRepoChapter>();
  const addlCols = createMemo(() => {
    const arr = props.colsByRepoBranch.map((repo) => {
      return columnHelper.group({
        header: repo.repoName,
        columns: repo.branches.map((branch) => {
          return columnHelper.accessor(
            (chapRow) => {
              // match repo, match branch, match chapter
              const matchingBook = branch.data.find(
                (book) =>
                  book.name?.toUpperCase() == chapRow.bookParent?.toUpperCase()
              );

              const matchingChapter =
                matchingBook &&
                matchingBook.chapters.find((chap) => {
                  const match = chap.chapNum == chapRow.chapNum;
                  if (!match) {
                  }
                  return match;
                });
              if (!matchingBook || !matchingChapter) {
              }
              return matchingChapter?.chapterLineCount;
            },
            {
              header: branch.branchName,
              id: `${repo.repoName}-${branch.branchName}`,
            }
          );
        }),
      });
    });
    return arr;
  });
  const columns = [
    columnHelper.accessor("chapNum", {
      cell: (chap) => {
        return chap.row.getCanExpand() ? (
          <button
            onClick={() => {
              // add if not present in arr of expandeds, or remove if so.
              if (expandedRows().includes(chap.row.id)) {
                setExpandedRows(
                  expandedRows().filter((row) => row != chap.row.id)
                );
              } else {
                setExpandedRows((prev) => [...prev, chap.row.id]);
              }
            }}
            class="cursor-pointer inline-flex items-center gap-1"
          >
            {expandedRows().includes(chap.row.id) ? (
              <Icon className="i-mdi-arrow-down-bold" text={chap.getValue()} />
            ) : (
              <Icon className="i-mdi-arrow-right-bold" text={chap.getValue()} />
            )}
          </button>
        ) : (
          chap.getValue()
        );
      },
      header: "Chapter Number",
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
      getExpandedRowModel: getExpandedRowModel(),
      getRowCanExpand: () => true,
      columns: columns,
    });
  const renderVersesTable = (row: Row<IRepoChapter>) => {
    function getVersesForChapter(
      chapters: IRepoChapter[],
      chapterNum: string
    ): IRepoVerse[] {
      const verses: IRepoVerse[] = [];
      const uniqueVerses = new Set<string>();
      chapters.forEach((chapter) => {
        if (chapter.chapNum === chapterNum) {
          chapter.verses.forEach((verse) => {
            if (!uniqueVerses.has(verse.verseNum)) {
              verses.push({...verse, chapParent: chapter.chapNum});
            }
          });
        }
      });
      return verses;
    }
    const vl = getVersesForChapter(props.bookList, row.original.chapNum);
    console.log({vl});

    return (
      <VerseTable
        verseList={vl}
        colsByRepoBranch={props.colsByRepoBranch}
        chapNum={row.original.chapNum}
        bookName={props.bookName}
      />
    );
  };
  function db(row: Row<IRepoChapter>) {
    const isExp = expandedRows().includes(row.id);
    return isExp;
  }

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
                {db(row) && (
                  <tr>
                    <td colSpan={row.getVisibleCells().length}>
                      {renderVersesTable(row)}
                    </td>
                  </tr>
                )}
              </>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}
