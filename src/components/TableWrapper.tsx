import {createSignal, Show, For, createMemo} from "solid-js";
import {createStore, produce} from "solid-js/store";
import {unzip, strFromU8, FlateError, Unzipped} from "fflate";
import {BIBLE_BOOK_ORDER} from "@constants";
import type {
  IRepoBook,
  IRepoVerse,
  IRepoChapter,
  ITableBetter,
} from "@customTypes";
import {BookTable} from "@components/BookTable";

interface ITableWrapper {
  baseUrl: string;
  user: string;
  repo: string;
  branches: Array<{
    name: string;
  }>;
}

export function TableWrapper(props: ITableWrapper) {
  const [isFetchingLoading, setIsFetchingLoading] = createSignal("");
  const [repoState, setRepoState] = createSignal({
    username: props.user,
    // repo: props.repo,
    repo: "en_tn",
  });

  // [{r: [bs]}]
  const [branches, setBranches] = createSignal([
    {
      repo: props.repo,
      branches: props.branches,
    },
  ]);

  const initialData3: ITableBetter = BIBLE_BOOK_ORDER.map((bookSlug) => {
    return {
      bookName: bookSlug,
      repositories: [
        {
          name: props.repo,
          branches: props.branches.map((branch) => {
            return {
              repoName: String(props.repo),
              branchName: branch.name,
              blob: null,
              data: null,
            };
          }),
        },
      ],
    };
  });

  const [fetchedData, setFetchedData] = createStore(initialData3);

  async function unzipFolder(
    u8Arr: Uint8Array
  ): Promise<Unzipped | FlateError> {
    return new Promise((res, rej) => {
      return unzip(u8Arr, (err, data) => {
        if (err) rej(err);
        else {
          res(data);
        }
      });
    });
  }

  async function fetchData(branchArg: string, repoArg: string) {
    // /{owner}/{repo}/archive/{filepath}
    setIsFetchingLoading(`Fetching the remote ${branchArg} zip file`);
    const branchZipUrl = `${props.baseUrl}/${props.user}/${repoArg}/archive/${branchArg}.zip`;
    console.time("fetch");
    // const cfFunctionsBase = import.meta.env.DEV
    //   ? "http://127.0.0.1:8788/api"
    //   : `${window.location.origin}/api`;
    const resp = await fetch(
      `${window.location.origin}/api/getRemoteZip?user=${props.user}&branch=${branchArg}&repo=${repoArg}`,
      {}
    );
    console.timeEnd("fetch");
    console.time("read array buffer");
    setIsFetchingLoading(`Beginning to unzip folder`);
    const u8Arr = new Uint8Array(await resp.arrayBuffer());
    console.timeEnd("read array buffer");
    console.time("make blob");
    const blob = new Blob([u8Arr.buffer]);
    console.timeEnd("make blob");
    setIsFetchingLoading("Starting unzip of folder");
    const folder = await unzipFolder(u8Arr);
    const regex = /.+\/[A-Za-z0-9]+\/[0-9]+\/[0-9]+.+/;
    console.time("rest");
    const filteredOutEmptyDirectories = Object.entries(folder)
      .filter(([name, data]) => data.length && regex.test(name))
      .map(([k, v]) => {
        return {
          name: k,
          content: strFromU8(v),
        };
      });

    function reduceToIRepoBook(
      book: string,
      repoArg: string,
      branchArg: string
    ) {
      const thatBook = filteredOutEmptyDirectories.filter((fileName) => {
        const [bookName, chapterNum, verse] = fileName.name
          .split("/")
          .slice(1, 4);
        return bookName.toUpperCase() == book.toUpperCase();
      });
      return thatBook.reduce((accumulator: IRepoBook, obj) => {
        const content = obj.content;
        const [bookName, chapterNum, verse] = obj.name.split("/").slice(1, 4);
        const verseLength = obj.content.split("\n").length - 1;
        if (!accumulator.chapters?.length) {
          accumulator.name = bookName;
          accumulator.chapters = [];
          accumulator.level = "book";
          accumulator.totalLineCount = 0;
        }
        const chapterIndex = accumulator.chapters.findIndex(
          (chapter) => chapter.chapNum === chapterNum
        );

        const vrs: IRepoVerse = {
          verseNum: verse,
          content,
          level: "verse",
          verseLineCount: content.split("\n").length,
          repoName: repoArg,
          branchName: branchArg,
          chapParent: chapterNum,
          bookName: bookName,
        };

        if (chapterIndex === -1) {
          const chapter: IRepoChapter = {
            chapNum: chapterNum,
            chapterLineCount: vrs.verseLineCount,
            verses: [vrs],
            level: "chapter",
            repoName: repoArg,
            branchName: branchArg,
            bookParent: bookName,
          };
          accumulator.chapters.push(chapter);
          accumulator.totalLineCount += vrs.verseLineCount;
        } else {
          const chapter = accumulator.chapters[chapterIndex];
          chapter.verses.push(vrs);
          chapter.chapterLineCount += vrs.verseLineCount;
          accumulator.totalLineCount += vrs.verseLineCount;
        }
        return accumulator;
      }, {} as IRepoBook);
    }

    setIsFetchingLoading(`Finishing up`);
    setFetchedData(
      produce((prevStore) => {
        // operate on each book in store
        prevStore.forEach((book, idx) => {
          // note: produce mutations don't seem to work if you just use find and then edit that obj.  I would think pass by ref, but you need to reference its full path with indexes.
          let currentRepo = book.repositories.findIndex(
            (repo) => repo.name == repoArg
          );
          if (currentRepo == -1) return;

          let currentBranch = prevStore[idx].repositories[
            currentRepo
          ].branches.findIndex((branch) => {
            return branch.branchName === branchArg;
          });
          if (currentBranch == -1) return;
          const branchData = reduceToIRepoBook(
            book.bookName,
            repoArg,
            branchArg
          );
          prevStore[idx].repositories[currentRepo].branches[currentBranch] = {
            branchName: branchArg,
            blob: blob,
            data: branchData,
            repoName: repoArg,
          };
        });
      })
    );

    console.timeEnd("rest");
    setIsFetchingLoading("");
  }
  const reposWithContentFetch = createMemo(() => {
    const fd = fetchedData
      .map((book) => {
        let temp = {
          bookName: book.bookName,
          repositories: book.repositories
            .map((repo) => {
              return {
                name: repo.name,
                branches: repo.branches.filter((branch) => !!branch.data),
              };
            })
            .filter((repo) => repo.branches.some((branch) => !!branch.data)),
        };
        return temp;
      })
      .filter((book) => book.repositories.length);
    console.log({fd});

    return {
      hasFetched: fd.length > 0,
      data: fd,
    };
  });
  async function addRepoAndGetBranches(e: Event) {
    e.preventDefault();
    // const cfFunctionsBase = import.meta.env.DEV
    //   ? "http://127.0.0.1:8788/api"
    //   : `${window.location.origin}/api`;

    const url = `${window.location.origin}/api/getRemoteBranches?user=${
      repoState().username
    }&repo=${repoState().repo}`;
    const resp = await fetch(url);
    const data = (await resp.json()) as {name: string}[];
    setBranches((prev) => {
      return [
        {
          repo: repoState().repo,
          branches: data,
        },
        ...prev,
      ];
    });
    // prevStore[book][String(repoArg)]
    setFetchedData(
      produce((prev) => {
        prev.forEach((book, bookIdx) => {
          prev[bookIdx].repositories.push({
            name: repoState().repo,
            branches: data.map((branch: any) => {
              return {
                blob: null,
                branchName: branch.name,
                data: null,
                repoName: repoState().repo,
              };
            }),
          });
        });
      })
    );
    // arr of branches;
  }
  function addRepoState(e: Event, field: string) {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    setRepoState((prev) => {
      const newSt = {
        ...prev,
        [field]: value,
      };
      return newSt;
    });
  }

  return (
    <div>
      <div>
        <p>Current Branches. Click to fetch repo</p>
        <For each={branches()}>
          {(rep) => (
            <>
              <p>{rep.repo}</p>
              <ul class="flex gap-2  mb-4 mt-2">
                <For each={rep.branches}>
                  {(branch) => (
                    <li
                      onClick={() => fetchData(branch.name, String(rep.repo))}
                    >
                      <button class="px-4 py-2 bg-gray-300 hover:bg-green-300 block ">
                        {branch.name}
                      </button>
                    </li>
                  )}
                </For>
              </ul>
            </>
          )}
        </For>
      </div>
      <div>
        Add another repo
        <form onSubmit={(e) => addRepoAndGetBranches(e)}>
          <label>
            Username
            <input
              class="block border border-blue-700 px-2 py-1"
              type="text"
              onInput={(e) => addRepoState(e, "username")}
              value={repoState().username}
            />
          </label>
          <label>
            Repo
            <input
              class="block border border-blue-700 px-2 py-1"
              type="text"
              onInput={(e) => addRepoState(e, "repo")}
              value={repoState().repo}
            />
          </label>
          <button
            type="submit"
            class="block px-2 py-1 bg-blue-800 text-white hover:opacity-80 hover:bg-blue-700"
          >
            Get new branches
          </button>
        </form>
      </div>
      <Show when={isFetchingLoading()}>{isFetchingLoading()}</Show>
      <Show when={reposWithContentFetch()?.hasFetched}>
        <BookTable data={reposWithContentFetch()?.data} />
      </Show>
    </div>
  );
}
