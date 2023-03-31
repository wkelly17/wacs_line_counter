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
import type {
  IRepoBook,
  IRepoBucket,
  IRepoChapter,
  ITableBetter,
  ITableBetterEntry,
} from "@customTypes";
import {ChapterTable} from "@components/ChapterTable";
import {TableRow} from "@components/TableRow";
import {Icon} from "@components/Icon";

type IBookTable = {
  data: ITableBetter;
};
export function BookTable(props: IBookTable) {
  const [sorting, setSorting] = createSignal<SortingState>([]);
  // the changing columns seems to reset expanded state, so manually track rows here
  const [expandedRows, setExpandedRows] = createSignal<string[]>([]);

  const repoBuckets2 = createMemo(() => {
    const repoMap: Map<
      string,
      {repoName: string; branches: {branchName: string; data: IRepoBook[]}[]}
    > = new Map();

    props.data.forEach((book) => {
      book.repositories.forEach((repository) => {
        const repoName = repository.name;
        repository.branches.forEach((branch) => {
          const branchName = branch.branchName;
          if (branch.data) {
            if (!repoMap.has(repoName)) {
              repoMap.set(repoName, {repoName: repoName, branches: []});
            }
            const repo = repoMap.get(repoName)!;
            let branchData = repo.branches.find(
              (b) => b.branchName === branchName
            );
            if (!branchData) {
              // doesn't exist init branch
              branchData = {branchName: branchName, data: []};
              repo.branches.push(branchData);
            }
            branchData.data.push(branch.data);
            // branchData.data.push(...branch.data);
          }
        });
      });
    });

    const repoBucket: IRepoBucket = [];

    repoMap.forEach((value) => {
      repoBucket.push(value);
    });
    console.log({repoBucket});
    return repoBucket;
  });

  const columnHelper = createColumnHelper<ITableBetterEntry>();
  const addlCols = createMemo(() => {
    const arr = repoBuckets2().map((repo) => {
      let col = columnHelper.group({
        header: repo.repoName,
        columns: repo.branches.map((branch) => {
          const dataCol = columnHelper.accessor(
            (row) => {
              return matchData({
                row: row,
                argBranch: branch.branchName,
                argRepoName: repo.repoName,
                data: branch.data,
              });
            },
            {
              cell: (val) => (
                <span>
                  {new Intl.NumberFormat(navigator.language).format(
                    Number(val.getValue())
                  )}
                </span>
              ),
              id: `${repo.repoName}-${branch.branchName}`,
              // 🧠 An easy way to remember: If you define a column with an accessor function, either provide a string header or provide a unique id property. This looks unwieldy, but otherwise, if the header is the same, it won't deduplicate the columns as needed.  tricky tricky..
              // header: `${repo.repoName}-${branch.branchName}`,
              header: branch.branchName,
            }
          );
          return dataCol;
        }),
      });

      return col;
    });

    return arr;
  });
  const cols = createMemo(() => [
    // Every book of bib;
    columnHelper.accessor("bookName", {
      cell: (book) => {
        return book.row.getCanExpand() ? (
          <button
            onClick={() => {
              // add if not present in arr of expandeds, or remove if so.
              if (expandedRows().includes(book.row.id)) {
                setExpandedRows(
                  expandedRows().filter((row) => row != book.row.id)
                );
              } else {
                setExpandedRows((prev) => [...prev, book.row.id]);
              }
            }}
            class="cursor-pointer inline-flex items-center gap-1"
          >
            {expandedRows().includes(book.row.id) ? (
              <Icon className="i-mdi-arrow-down-bold" text={book.getValue()} />
            ) : (
              <Icon className="i-mdi-arrow-right-bold" text={book.getValue()} />
            )}
          </button>
        ) : (
          book.getValue()
        );
      },
      header: "Book Name",
    }),
    ...addlCols(),
  ]);

  function matchData({
    row,
    argBranch,
    argRepoName,
    data,
  }: {
    row: ITableBetterEntry;
    argBranch: string;
    argRepoName: string;
    data: IRepoBook[];
  }) {
    const matchingBook = data.find(
      (book) => book.name.toUpperCase() == row.bookName.toUpperCase()
    );
    return matchingBook?.totalLineCount || "";
  }

  const table = () =>
    createSolidTable({
      get data() {
        return props.data;
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
      columns: cols(),
    });
  const renderChaptersTable = (row: Row<ITableBetterEntry>) => {
    function getChaptersForBook(
      entries: ITableBetterEntry[],
      bookName: string
    ): IRepoChapter[] {
      const chapters: IRepoChapter[] = [];
      const uniqueChapters = new Set<string>();
      const entry = entries.find((e) => e.bookName === bookName);

      // if the entry is found, map the branches to chapters with bookParent set to bookName
      if (entry) {
        entry.repositories.forEach((repo) => {
          repo.branches.forEach((branch) => {
            branch.data?.chapters.forEach((chapter) => {
              if (!uniqueChapters.has(chapter.chapNum)) {
                const {chapNum, chapterLineCount, verses, level} = chapter;

                const chapterObj: IRepoChapter = {
                  chapNum,
                  chapterLineCount,
                  verses,
                  level,
                  bookParent: bookName,
                };
                uniqueChapters.add(chapter.chapNum);
                chapters.push(chapterObj);
              }
            });
          });
        });
      }

      return chapters;
    }

    const chaps = getChaptersForBook(props.data, row.original.bookName);
    const colsByRepoBranch = repoBuckets2();

    return (
      <ChapterTable
        bookList={chaps}
        colsByRepoBranch={colsByRepoBranch}
        bookName={row.original.bookName}
      />
    );
  };
  function db(row: Row<ITableBetterEntry>) {
    const isExp = expandedRows().includes(row.id);
    return isExp;
  }
  return (
    <div class="w-max ">
      <table class="w-full">
        <thead class="m-0  border-b border-b-black bg-grey-300 w-full">
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
                      {renderChaptersTable(row)}
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
