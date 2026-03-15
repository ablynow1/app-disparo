import { getContactsWithRecentMessages } from '@/actions/chat';
import { ChatInterface } from './ChatInterface';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
    const initialContacts = await getContactsWithRecentMessages();

    return (
        <div className="h-[calc(100vh-8rem)]">
            <ChatInterface initialContacts={initialContacts} />
        </div>
    );
}
