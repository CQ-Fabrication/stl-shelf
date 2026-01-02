import { Box, HardDrive } from 'lucide-react'
import type { UploadLimitsResult } from '@/hooks/use-upload-limits'
import { formatStorage } from '@/lib/billing/utils'

type UploadUsageIndicatorProps = {
  limits: UploadLimitsResult
}

export function UploadUsageIndicator({ limits }: UploadUsageIndicatorProps) {
  // Pro tier: hide model count (unlimited), only show storage
  const showModelCount = !limits.models.isUnlimited

  return (
    <div className="flex items-center gap-4 text-muted-foreground text-sm">
      {showModelCount && (
        <div className="flex items-center gap-1.5">
          <Box className="h-4 w-4" />
          <span>
            {limits.models.current}/{limits.models.limit} models
          </span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <HardDrive className="h-4 w-4" />
        <span>
          {formatStorage(limits.storage.current)}/
          {formatStorage(limits.storage.limit)}
        </span>
      </div>
    </div>
  )
}
