import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DevAssistant } from '../components/DevAssistant';
import { useEditorTemplates } from '../services/editorHooks';

const EditorPage = ({ devMode }) => {
  const { spaceId } = useParams();
  const { data: templates } = useEditorTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState();

  const widgets = useMemo(() => {
    const template = templates?.find((item) => item.id === selectedTemplate);
    return template?.widgets ?? [];
  }, [templates, selectedTemplate]);

  return (
    <DevAssistant devMode={devMode} message="Drag widgets into the canvas. Switch to dev mode to hide helper prompts.">
      <div className="editor-page">
        <aside className="editor-sidebar">
          <h2>Templates</h2>
          <ul>
            {templates?.map((template) => (
              <li key={template.id}>
                <button type="button" onClick={() => setSelectedTemplate(template.id)}>
                  {template.name}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <section className="editor-canvas">
          <h1>Editor for space {spaceId}</h1>
          <p>Select a template to preview available widgets. Drag-and-drop logic is implemented in future iterations.</p>
          <div className="widget-preview">
            {widgets.map((widget) => (
              <span key={widget} className="widget-chip">
                {widget}
              </span>
            ))}
          </div>
        </section>
      </div>
    </DevAssistant>
  );
};

export default EditorPage;
