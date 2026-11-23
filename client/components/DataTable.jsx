import { Inbox } from 'lucide-react';

/** Shared table with a lightweight skeleton state and a friendly empty state. */
export default function DataTable({ columns, rows, empty = 'No records found', loading = false }) {
  if (loading) {
    return (
      <div className="table-wrap">
        <table className="data" aria-busy="true" aria-label="Loading records">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={i} className={col.numeric ? 'num' : ''}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3].map((rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((col, i) => (
                  <td key={i} className={col.numeric ? 'num' : ''}>
                    <span className="skeleton skeleton-cell" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="empty">
        <Inbox size={24} strokeWidth={1.6} aria-hidden="true" />
        {empty}
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} className={col.numeric ? 'num' : ''}>
                {col.header}
              </th>
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
