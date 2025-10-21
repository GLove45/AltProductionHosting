import { useParams } from 'react-router-dom';
import { useHostingSpaceDetail } from '../services/hostingHooks';

const HostingSpacePage = () => {
  const { spaceId } = useParams();
  const { data: space } = useHostingSpaceDetail(spaceId ?? '');

  if (!space) {
    return <p>Loading space details...</p>;
  }

  return (
    <div className="hosting-space-page">
      <header>
        <h1>{space.name} files</h1>
        <p>Upload HTML, CSS, JS, or server scripts. Storage usage updates in real time.</p>
      </header>
      <table className="files-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Size (MB)</th>
          </tr>
        </thead>
        <tbody>
          {space.files.map((file) => (
            <tr key={file.id}>
              <td>{file.name}</td>
              <td>{file.contentType}</td>
              <td>{file.sizeMb}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HostingSpacePage;
