export default function MessageList({ messages }) {
  return (
    <div className="h-64 overflow-y-auto border p-2 mb-3">
      {messages.map((msg, i) => (
        <div key={i} className="p-1 border-b">
          <strong>{msg.user}: </strong>{msg.text}
        </div>
      ))}
    </div>
  );
}
