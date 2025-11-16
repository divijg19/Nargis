import { redirect } from "next/navigation";

export default function GoalsRedirectPage() {
    // Server-side redirect to the Journal page.
    redirect('/journal');
}
