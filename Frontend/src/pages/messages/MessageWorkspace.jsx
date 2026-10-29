import { useEffect, useState } from "react";
import { Button, EmptyState, Field, LoadingState, Notice } from "../../components/ui/index.js";
import { apiCalls, getApiError, responseData } from "../../services/api.js";
import { initials } from "../../utils/format.js";

export default function MessageWorkspace({ contacts = [], currentUserId }) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function loadConversations(preferredId) {
    setLoading(true);
    setError("");
    try {
      const rows = responseData(await apiCalls.conversations.list()) ?? [];
      setConversations(rows);
      const nextId = preferredId || (rows.some((item) => item.id === selectedId) ? selectedId : rows[0]?.id) || "";
      setSelectedId(nextId);
      if (nextId) {
        const conversation = rows.find((item) => item.id === nextId);
        setMessages(responseData(await apiCalls.conversations.messages(nextId)) ?? []);
        if (conversation) setSelectedId(conversation.id);
      } else {
        setMessages([]);
      }
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to load conversations."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadConversations(); }, []);

  async function openConversation(id) {
    setSelectedId(id);
    setError("");
    try {
      setMessages(responseData(await apiCalls.conversations.messages(id)) ?? []);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to load messages."));
    }
  }

  async function startWith(contact) {
    setError("");
    try {
      const response = await apiCalls.conversations.start(contact.id);
      const conversation = responseData(response);
      await loadConversations(conversation.id);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to start conversation."));
    }
  }

  async function send(event) {
    event.preventDefault();
    if (!selectedId || !body.trim()) return;
    setSending(true);
    setError("");
    try {
      const response = await apiCalls.conversations.send(selectedId, body.trim());
      setMessages((previous) => [...previous, responseData(response)]);
      setBody("");
      await loadConversations(selectedId);
    } catch (requestError) {
      setError(getApiError(requestError, "Unable to send message."));
    } finally {
      setSending(false);
    }
  }

  const selected = conversations.find((item) => item.id === selectedId);
  const other = selected?.Users?.find((participant) => participant.id !== currentUserId) ?? selected?.Users?.[0];

  if (loading && !conversations.length) return <LoadingState label="Loading conversations…" />;
  return (
    <div className="messages-layout">
      <aside className="conversation-list panel">
        <div className="conversation-heading"><div><p className="overline">Inbox</p><h2>Messages</h2></div><button className="icon-button" onClick={() => loadConversations()} aria-label="Refresh conversations">↻</button></div>
        {contacts.length > 0 && <div className="contact-picker"><Field label="Start a conversation"><select defaultValue="" onChange={(event) => { const contact = contacts.find((item) => item.id === event.target.value); if (contact) startWith(contact); event.target.value = ""; }}><option value="" disabled>Choose a contact</option>{contacts.map((contact) => <option value={contact.id} key={contact.id}>{contact.name} · {contact.role}</option>)}</select></Field></div>}
        {conversations.length ? conversations.map((conversation) => {
          const participant = conversation.Users?.[0];
          const preview = conversation.Messages?.[0]?.body ?? "Start the conversation";
          return <button className={`conversation-item ${selectedId === conversation.id ? "is-active" : ""}`} key={conversation.id} onClick={() => openConversation(conversation.id)}>
            <span className="avatar">{initials(participant?.fullName)}</span><span><b>{participant?.fullName ?? "Conversation"}</b><small>{preview}</small></span>
          </button>;
        }) : <EmptyState title="No conversations" detail="Choose a contact above to start messaging." />}
      </aside>
      <section className="chat-panel panel">
        <div className="chat-heading">{selected ? <><span className="avatar">{initials(other?.fullName)}</span><span><b>{other?.fullName ?? "FitConsole member"}</b><small>{other?.role ?? "Participant"}</small></span></> : <span className="muted">Select a conversation</span>}</div>
        <Notice error={error} />
        <div className="chat-history">
          {messages.map((message) => <div className={`chat-bubble ${message.senderId === currentUserId ? "chat-bubble--mine" : "chat-bubble--other"}`} key={message.id}><p>{message.body}</p><time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></div>)}
          {!messages.length && selected && <EmptyState title="Say hello" detail="Messages are only visible to participants in this conversation." />}
        </div>
        <form className="chat-compose" onSubmit={send}><input aria-label="Message" placeholder={selected ? "Write a message…" : "Select a conversation first"} value={body} onChange={(event) => setBody(event.target.value)} disabled={!selected} maxLength={10000} /><Button type="submit" disabled={!selected || !body.trim() || sending}>{sending ? "Sending…" : "Send"}</Button></form>
      </section>
    </div>
  );
}
