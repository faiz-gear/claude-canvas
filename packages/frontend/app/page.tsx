export default function Dashboard() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-4">
          Claude Canvas
        </h1>
        <p className="text-slate-300 text-lg">
          Claude Code Web UI with Agent execution visualization
        </p>
        <div className="mt-8 p-6 bg-slate-800 rounded-lg border border-slate-700">
          <p className="text-green-400">Status: Connected</p>
          <p className="text-slate-400 mt-2">Your workspace is ready!</p>
        </div>
      </div>
    </main>
  )
}
