import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function PrivateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession();

    if (!session) {
        redirect('/auth');
    }

    return children;
}
