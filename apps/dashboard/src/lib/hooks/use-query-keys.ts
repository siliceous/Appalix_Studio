/**
 * React Query Key Factory
 *
 * Centralized query key management for multi-tenant cache isolation.
 * All query keys include workspaceId to prevent cross-workspace cache mixing.
 *
 * Pattern: queryKeys.{feature}.{operation}(filters)
 * Example: queryKeys.images.all(workspaceId)
 *          queryKeys.images.detail(workspaceId, imageId)
 *          queryKeys.actors.list(workspaceId, { type: 'custom' })
 */

/**
 * Creates workspace-scoped query keys
 * CRITICAL: All keys must include workspaceId for proper cache isolation
 */
export const queryKeys = {
  /**
   * Images (AI-generated and uploads)
   */
  images: {
    all: (workspaceId: string) => [
      'images',
      workspaceId,
    ] as const,

    list: (workspaceId: string, filters?: { status?: string; limit?: number; offset?: number }) => [
      'images',
      workspaceId,
      'list',
      filters,
    ] as const,

    detail: (workspaceId: string, imageId: string) => [
      'images',
      workspaceId,
      'detail',
      imageId,
    ] as const,

    deleted: (workspaceId: string) => [
      'images',
      workspaceId,
      'deleted',
    ] as const,

    infinite: (workspaceId: string, filters?: Record<string, any>) => [
      'images',
      workspaceId,
      'infinite',
      filters,
    ] as const,
  },

  /**
   * Videos (AI-generated)
   */
  videos: {
    all: (workspaceId: string) => [
      'videos',
      workspaceId,
    ] as const,

    list: (workspaceId: string, filters?: { status?: string; limit?: number; offset?: number }) => [
      'videos',
      workspaceId,
      'list',
      filters,
    ] as const,

    detail: (workspaceId: string, videoId: string) => [
      'videos',
      workspaceId,
      'detail',
      videoId,
    ] as const,

    status: (workspaceId: string, videoId: string) => [
      'videos',
      workspaceId,
      'status',
      videoId,
    ] as const,
  },

  /**
   * Talking Actors
   */
  actors: {
    all: (workspaceId: string) => [
      'actors',
      workspaceId,
    ] as const,

    list: (workspaceId: string, filters?: { type?: string }) => [
      'actors',
      workspaceId,
      'list',
      filters,
    ] as const,

    detail: (workspaceId: string, actorId: string) => [
      'actors',
      workspaceId,
      'detail',
      actorId,
    ] as const,

    available: (workspaceId: string) => [
      'actors',
      workspaceId,
      'available',
    ] as const,

    global: () => [
      'actors',
      'global',
    ] as const,
  },

  /**
   * Gemini Voices
   */
  voices: {
    all: () => [
      'voices',
    ] as const,

    workspace: (workspaceId: string) => [
      'voices',
      workspaceId,
    ] as const,

    byLanguage: (languageCode: string, workspaceId?: string) => [
      'voices',
      'language',
      languageCode,
      workspaceId,
    ] as const,

    forActor: (workspaceId: string, actorId: string) => [
      'voices',
      workspaceId,
      'actor',
      actorId,
    ] as const,

    languages: () => [
      'voices',
      'languages',
    ] as const,
  },

  /**
   * Projects
   */
  projects: {
    all: (workspaceId: string) => [
      'projects',
      workspaceId,
    ] as const,

    list: (workspaceId: string, filters?: { limit?: number; offset?: number }) => [
      'projects',
      workspaceId,
      'list',
      filters,
    ] as const,

    detail: (workspaceId: string, projectId: string) => [
      'projects',
      workspaceId,
      'detail',
      projectId,
    ] as const,

    infinite: (workspaceId: string, filters?: Record<string, any>) => [
      'projects',
      workspaceId,
      'infinite',
      filters,
    ] as const,
  },

  /**
   * Brand Assets
   */
  brand: {
    profile: (workspaceId: string) => [
      'brand',
      workspaceId,
      'profile',
    ] as const,

    assets: (workspaceId: string, filters?: { type?: string }) => [
      'brand',
      workspaceId,
      'assets',
      filters,
    ] as const,

    detail: (workspaceId: string, assetId: string) => [
      'brand',
      workspaceId,
      'assets',
      assetId,
    ] as const,
  },

  /**
   * Forms
   */
  forms: {
    all: (workspaceId: string) => [
      'forms',
      workspaceId,
    ] as const,

    list: (workspaceId: string, filters?: { limit?: number; offset?: number }) => [
      'forms',
      workspaceId,
      'list',
      filters,
    ] as const,

    submissions: (workspaceId: string, formId: string, filters?: { limit?: number; offset?: number }) => [
      'forms',
      workspaceId,
      'submissions',
      formId,
      filters,
    ] as const,
  },

  /**
   * Generations (Images & Videos combined)
   */
  generations: {
    all: (workspaceId: string) => [
      'generations',
      workspaceId,
    ] as const,

    list: (workspaceId: string, type?: 'image' | 'video', filters?: Record<string, any>) => [
      'generations',
      workspaceId,
      'list',
      type,
      filters,
    ] as const,

    detail: (workspaceId: string, generationId: string) => [
      'generations',
      workspaceId,
      'detail',
      generationId,
    ] as const,
  },

  /**
   * Assets (generic)
   */
  assets: {
    all: (workspaceId: string) => [
      'assets',
      workspaceId,
    ] as const,

    list: (workspaceId: string, filters?: { type?: string; projectId?: string; limit?: number; offset?: number }) => [
      'assets',
      workspaceId,
      'list',
      filters,
    ] as const,

    detail: (workspaceId: string, assetId: string) => [
      'assets',
      workspaceId,
      'detail',
      assetId,
    ] as const,
  },

  /**
   * Email Campaigns
   */
  campaigns: {
    all: (workspaceId: string) => [
      'campaigns',
      workspaceId,
    ] as const,

    list: (workspaceId: string, filters?: { status?: string; limit?: number; offset?: number }) => [
      'campaigns',
      workspaceId,
      'list',
      filters,
    ] as const,

    detail: (workspaceId: string, campaignId: string) => [
      'campaigns',
      workspaceId,
      'detail',
      campaignId,
    ] as const,

    stats: (workspaceId: string, campaignId: string) => [
      'campaigns',
      workspaceId,
      'stats',
      campaignId,
    ] as const,
  },
} as const

/**
 * Helper to invalidate all workspace queries
 * Useful when user switches workspaces
 */
export function getAllWorkspaceQueryKeys(workspaceId: string): string[] {
  return [
    'images',
    'videos',
    'actors',
    'voices',
    'projects',
    'brand',
    'forms',
    'generations',
    'assets',
    'campaigns',
  ].map((key) => `${key}-${workspaceId}`)
}

/**
 * Helper to invalidate specific feature queries across all workspaces
 * Useful for global invalidation (e.g., after admin action)
 */
export function getFeatureQueryKeys(feature: keyof typeof queryKeys): string[] {
  const featureKey = feature as string
  return [featureKey]
}
