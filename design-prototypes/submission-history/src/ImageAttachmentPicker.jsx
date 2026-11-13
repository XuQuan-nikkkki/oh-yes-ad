import React, { useEffect, useRef } from 'react';
import { Button, Image, Upload } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const readImage = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function ImageAttachmentPicker({ images = [], onChange, capturePaste = false }) {
  const rootRef = useRef(null);

  const addFiles = async files => {
    const imageFiles = Array.from(files || []).filter(file => file.type?.startsWith('image/'));
    if (!imageFiles.length) return false;
    const urls = await Promise.all(imageFiles.map(readImage));
    onChange(old => [...old, ...urls]);
    return true;
  };

  const handlePaste = async event => {
    const files = Array.from(event.clipboardData?.items || [])
      .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter(Boolean);
    if (!files.length) return;
    event.preventDefault();
    await addFiles(files);
  };

  useEffect(() => {
    if (!capturePaste) return undefined;
    const listener = event => {
      if (rootRef.current?.contains(event.target)) return;
      const modal = rootRef.current?.closest('.ant-modal');
      const activeModal = document.activeElement?.closest?.('.ant-modal');
      if (modal && (!activeModal || activeModal === modal)) handlePaste(event);
    };
    document.addEventListener('paste', listener);
    return () => document.removeEventListener('paste', listener);
  });

  return <div ref={rootRef} className="feedback-images" tabIndex={0} onPaste={handlePaste} aria-label="图片附件，可粘贴剪贴板图片">
    {images.map((img, imageIndex) => <div className="feedback-image-item" key={`${imageIndex}-${String(img).slice(-16)}`}>
      <div className="feedback-image-frame"><Image src={img} preview={{ mask: '预览' }}/></div>
      <Button size="small" type="text" onClick={() => onChange(old => old.filter((_, index) => index !== imageIndex))}>移除</Button>
    </div>)}
    <Upload
      className="feedback-upload"
      listType="picture-card"
      accept="image/*"
      multiple
      beforeUpload={file => {
        addFiles([file]);
        return false;
      }}
      showUploadList={false}
    >
      <div className="upload-trigger"><PlusOutlined/><span>添加图片</span><small>或粘贴</small></div>
    </Upload>
  </div>;
}
