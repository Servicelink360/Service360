import querystring from "query-string";

export function getQueryParam<T>(): T {
  if (typeof window === "undefined") return {} as T;

  return querystring.parse(window.location.search) as any;
}

export function updateUrl(field_name: any, item_name: string) {
  if (typeof window === "undefined") return {};
  // eslint-disable-next-line no-restricted-globals
  const parsed = querystring.parse(location?.search);
  parsed[field_name] = item_name;
  const url = querystring.stringifyUrl({
    url: `${window.location.pathname}`,
    query: parsed,
  });
  window.history.pushState(null, "", url);
}
export function deleteUrl(field_name: any) {
  if (typeof window === "undefined") return {};
  // eslint-disable-next-line no-restricted-globals
  const parsed = querystring.parse(location.search);

  delete parsed[field_name];
  const url = querystring.stringifyUrl({
    url: `${window.location.pathname}`,
    query: parsed,
  });
  window.history.pushState(null, "", url);
}
