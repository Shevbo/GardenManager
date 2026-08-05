import Link from 'next/link'
import { Pencil, MapPin } from 'lucide-react'

/** Home header for the active org: cover photo, name + description, and map. */
export function OrgHeader({
  orgName,
  description,
  mapEmbedUrl,
  coverPhotoId,
  canEdit,
}: {
  orgName: string
  description: string | null
  mapEmbedUrl: string | null
  coverPhotoId: string | null
  canEdit: boolean
}) {
  const hasContent = !!description || !!mapEmbedUrl || !!coverPhotoId
  if (!hasContent) {
    if (!canEdit) return null
    return (
      <div className="bg-white border border-dashed border-[#D8D3C8] rounded-2xl px-5 py-4 flex items-center justify-between gap-3">
        <p className="text-sm text-[#6B6B63]">Добавьте описание, карту и фотографии — они появятся в шапке.</p>
        <Link href="/admin/org/profile" className="inline-flex items-center gap-1.5 text-sm text-[#0A3D2E] font-medium hover:underline shrink-0">
          <Pencil size={14} /> Заполнить
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#E0DBD0] rounded-2xl overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {coverPhotoId && (
          <div className="md:w-64 shrink-0 h-40 md:h-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/org-photos/${coverPhotoId}`} alt={orgName} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 p-5 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-[#1A1A18]">{orgName}</h2>
            {canEdit && (
              <Link href="/admin/org/profile" className="inline-flex items-center gap-1 text-xs text-[#6B6B63] hover:text-[#0A3D2E] shrink-0">
                <Pencil size={13} /> Редактировать
              </Link>
            )}
          </div>
          {description && (
            <p className="text-sm text-[#3D3D38] mt-2 leading-relaxed whitespace-pre-wrap line-clamp-6">{description}</p>
          )}
        </div>
      </div>
      {mapEmbedUrl && (
        <div className="border-t border-[#E0DBD0]">
          <div className="flex items-center gap-1.5 px-5 py-2 text-xs text-[#6B6B63]">
            <MapPin size={12} /> На карте
          </div>
          <iframe src={mapEmbedUrl} className="w-full h-64 border-0" loading="lazy" title={`Карта — ${orgName}`} />
        </div>
      )}
    </div>
  )
}
