export const onRequestGet: PagesFunction = async (context) => {
  const request: Request = context.request;
  const env = context.env;
  // const env = context.env as IcfEnv & typeof context.env;
  const url = new URL(request.url);
  const branch = url.searchParams?.get("branch") as string;
  const user = url.searchParams?.get("user") as string;
  const repo = url.searchParams?.get("repo") as string;

  try {
    const baseUrl = "https://content.bibletranslationtools.org/api/v1/repos";
    const branchZipUrl = `${baseUrl}/${user}/${repo}/archive/${branch}.zip`;
    const response = await fetch(branchZipUrl);
    if (response.ok) {
      return new Response(response.body, {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    } else {
      return new Response(null, {
        status: 404,
        statusText: "that file does not exist for this repo",
      });
    }
  } catch (error) {
    console.error(error);
    return new Response(null, {
      status: 404,
    });
  }
};
