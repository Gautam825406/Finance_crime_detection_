import { redirect } from "next/navigation";

/**
 * Homepage redirects to /analyze so the CSV uploader is the first thing
 * users (and judges) see. This satisfies the RIFT requirement that the
 * landing page shows the upload interface.
 */
export default function Home() {
  redirect("/analyze");
}
