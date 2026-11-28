"use client";
import { useEffect } from "react";
import { EmptyPanel, PageFrame, PageIntro } from "@epelawa/ui";
export default function ErrorPage({error,reset}:{error:Error & {digest?:string};reset:()=>void}) {
  useEffect(()=>{console.error("admin route render failed",{digest:error.digest});},[error.digest]);
  return <PageFrame><PageIntro title="This page could not be loaded" description="An unexpected problem interrupted this view. No success is being claimed."/><EmptyPanel title="Try the workspace again" description="Reload this page to retry. Contact the project owner if the problem continues." actions={<button type="button" className="btn-secondary" onClick={reset}>Try again</button>}/></PageFrame>;
}
