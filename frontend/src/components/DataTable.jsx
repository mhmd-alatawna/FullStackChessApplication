export default function DataTable({ columns, rows, rowKey = "id", emptyMessage = "No records found." }) {
  if (!rows.length) return <div className="table-empty"><span>♟</span><p>{emptyMessage}</p></div>;

  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={typeof rowKey === "function" ? rowKey(row) : row[rowKey] ?? index}>
              {columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? "—"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
