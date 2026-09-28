// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { track } from "../app/lib/analytics";
let send: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  vi.stubGlobal("location", { hostname: "generativeloaders.com", pathname: "/docs/", search: "" });
  send = vi.fn(() => true);
  vi.stubGlobal("navigator", { sendBeacon: send, doNotTrack: "0" });
});
afterEach(() => vi.unstubAllGlobals());
it("records on trailing-slash routes and falls back when beacon refuses a send", () => {
  track("install_copy"); expect(send).toHaveBeenCalledOnce();
  send.mockReturnValue(false); const fetchMock = vi.fn<(url: string, options: RequestInit) => Promise<void>>(() => Promise.resolve()); vi.stubGlobal("fetch", fetchMock);
  track("github_click"); expect(fetchMock).toHaveBeenCalledOnce();
  expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject({ event: "github_click", path: "/docs" });
});
it("respects opt-outs and never tracks local previews or the dashboard", () => {
  vi.stubGlobal("navigator", { sendBeacon: send, doNotTrack: "1" }); track("page_view");
  vi.stubGlobal("navigator", { sendBeacon: send, globalPrivacyControl: true }); track("page_view");
  vi.stubGlobal("navigator", { sendBeacon: send });
  vi.stubGlobal("location", { hostname: "localhost", pathname: "/", search: "" }); track("page_view");
  vi.stubGlobal("location", { hostname: "generativeloaders.com", pathname: "/analytics/", search: "" }); track("page_view");
  expect(send).not.toHaveBeenCalled();
});
it("continues safely when browser storage is disabled", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.stubGlobal("location", { hostname: "generativeloaders.com", pathname: "/", search: "?utm_source=github&utm_campaign=launch" });
  expect(() => track("page_view")).not.toThrow(); expect(send).toHaveBeenCalledOnce();
});
