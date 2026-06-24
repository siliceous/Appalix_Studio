export const metadata = {
  title: 'My Talking Actors',
}

export default function ActorsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 dark:border-white/10 px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          My Talking Actors
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your custom actor avatars
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="text-center">
          <p>Loading actors...</p>
        </div>
      </div>
    </div>
  )
}
