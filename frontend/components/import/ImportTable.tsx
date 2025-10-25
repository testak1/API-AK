export default function ImportTable({ missing, selected, onToggle }) {
  return (
    <table className="w-full border border-gray-300 text-sm">
      <thead className="bg-gray-100">
        <tr>
          <th></th>
          <th>Märke</th>
          <th>Modell</th>
          <th>År</th>
          <th>Motor</th>
          <th>Typ</th>
        </tr>
      </thead>
      <tbody>
        {missing.map((m, i) => (
          <tr key={i} className="border-b hover:bg-gray-50">
            <td>
              <input
                type="checkbox"
                checked={selected.includes(m.engine)}
                onChange={() => onToggle(m.engine)}
              />
            </td>
            <td>{m.brand}</td>
            <td>{m.model}</td>
            <td>{m.year}</td>
            <td>{m.engine}</td>
            <td>{m.fuel}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
