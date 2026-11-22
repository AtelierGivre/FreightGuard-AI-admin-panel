export default function DataTable({ columns, rows, empty = 'No records found' }) {
  if (!rows || rows.length === 0) {
    return <div className="empty">{empty}</div>;
  }
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={col.numeric ? 'num' : ''}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {columns.map((col, i) => (
                <td key={i} className={col.numeric ? 'num' : ''}>
                  {col.render ? col.render(row, ri) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
