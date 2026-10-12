import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { uploadImage, ik } from '../../lib/imagekit.js';
import { errMsg, toast, Spinner } from './Feedback.jsx';
import { Field } from './Form.jsx';

export function ImageUpload({ label = 'Image', value, onChange, shape = 'square' }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      onChange(await uploadImage(f));
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };
  return (
    <Field label={label}>
      <button type="button" onClick={() => ref.current?.click()} className={`relative flex h-24 w-24 items-center justify-center overflow-hidden border-2 border-dashed border-ink-200 bg-ink-50 text-ink-400 transition hover:border-brand-400 ${shape === 'round' ? 'rounded-full' : 'rounded-2xl'}`}>
        {value ? <img src={ik(value, 200)} alt="" className="h-full w-full object-cover" /> : <Camera className="h-6 w-6" />}
        {busy && <span className="absolute inset-0 flex items-center justify-center bg-white/70"><Spinner /></span>}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} />
    </Field>
  );
}
