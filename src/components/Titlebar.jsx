export default function Titlebar() {
  const handleMinimize = async () => {
    await window.electronAPI?.minimize()
  }

  const handleMaximize = async () => {
    await window.electronAPI?.maximize()
  }

  const handleClose = async () => {
    await window.electronAPI?.close()
  }

  return (
    <div
      style={{
        height: '32px',
        backgroundColor: 'transparent',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: '8px',
        userSelect: 'none',
        WebkitAppRegion: 'drag',
        paddingLeft: '12px',
      }}
    >
      <div></div>
      <div
        style={{
          display: 'flex',
          gap: '8px',
          WebkitAppRegion: 'no-drag',
        }}
      >
        <button
          onClick={handleMinimize}
          style={{
            background: 'none',
            border: 'none',
            color: '#000000',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Minimize"
        >
          −
        </button>
        <button
          onClick={handleMaximize}
          style={{
            background: 'none',
            border: 'none',
            color: '#000000',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Maximize"
        >
          ☐
        </button>
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#000000',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Close"
        >
          ×
        </button>
      </div>
    </div>
  )
}
