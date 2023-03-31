export interface IRepoBook {
  name: string;
  totalLineCount: number;
  chapters: IRepoChapter[];
  level: "book";
}

export interface IRepoChapter {
  chapNum: string;
  chapterLineCount: number;
  verses: IRepoVerse[];
  level: "chapter";
  repoName?: string;
  branchName?: string;
  bookParent?: string;
}

export interface IRepoVerse {
  verseNum: string;
  verseLineCount: number;
  content: string;
  level: "verse";
  chapParent?: string;
  branchName?: string;
  repoName?: string;
  bookName: string;
}

export interface IRepo {
  [book: string]: IRepoBook;
}

export interface ITableStructure {
  repositories: IRepository[];
}
export interface IRepository {
  repoName: string;
  branches: {branchName: string; data: IRepo | null}[];
  blob: null | Blob;
}

export type IBranchType = {
  branchName: string;
  blob: null | Blob;
  data: IRepoBook | null;
  repoName: string;
};
export type ITableRepoType = {
  [repositoryName: string]: IBranchType[];
};
export interface ITable {
  [bookName: string]: ITableRepoType;
}

export type ITableBetterEntry = {
  bookName: string;
  repositories: {
    name: string;
    branches: Array<IBranchType>;
  }[];
};
export type ITableBetter = Array<ITableBetterEntry>;

export type IRepoBucket = Array<{
  repoName: string;
  branches: Array<{
    branchName: string;
    data: IRepoBook[];
  }>;
}>;
