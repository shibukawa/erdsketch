import { ExternalLink, FolderOpen, HardDrive, Save, TriangleAlert } from "lucide-react";
import { useCallback } from "react";

type Props = {
  available: boolean;
  disabled: boolean;
  run: (action: () => Promise<boolean>) => Promise<boolean>;
  onOpen: () => Promise<boolean>;
  onSave: () => Promise<boolean>;
  onClose: () => void;
  onShowOriginPrivate: () => void;
};

export function FileSystemStoragePanel({ available, disabled, run, onOpen, onSave, onClose, onShowOriginPrivate }: Props) {
  const handleOpen = useCallback(async () => {
    if (await run(onOpen)) onClose();
  }, [onClose, onOpen, run]);
  const handleSave = useCallback(() => { void run(onSave); }, [onSave, run]);

  return <div className="p-6" role="tabpanel">
    <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-slate-50 p-6">
      <HardDrive size={28} className={available ? "text-blue-700" : "text-slate-400"} />
      <h3 className="mt-3 text-lg font-bold">Files and folders</h3>
      <p className="mt-2 text-sm text-slate-600">Open or save a project in a folder selected through this browser. Saving also keeps OPFS continuous recovery enabled.</p>
      {!available && <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert">
        <div className="flex items-start gap-3"><TriangleAlert className="mt-0.5 shrink-0" size={19} /><div><p className="font-bold">Direct file-system access is not supported by this browser.</p><p className="mt-1">Open and Save are disabled. Safari can still use Origin Private Storage and portable Import / Export.</p><a className="mt-2 inline-flex items-center gap-1 font-semibold text-blue-700 underline underline-offset-2" href="https://caniuse.com/native-filesystem-api" target="_blank" rel="noreferrer">View File System Access API browser support<ExternalLink size={14} /></a></div></div>
      </div>}
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" className="btn btn-outline gap-2" disabled={disabled || !available} onClick={handleOpen}><FolderOpen size={17} />Open from File System</button><button type="button" className="btn btn-primary gap-2" disabled={disabled || !available} onClick={handleSave}><Save size={17} />Save to File System</button></div>
      {!available && <button type="button" className="btn btn-outline btn-sm mt-5" onClick={onShowOriginPrivate}>Use Origin Private Storage or Import / Export</button>}
    </div>
  </div>;
}
