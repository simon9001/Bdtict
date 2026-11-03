import React from 'react'
import { CircleCheck, CircleDot, Circle } from 'lucide-react'
import type { WorkflowStage } from '../../types/Types'

interface StageProgressProps {
    stages: WorkflowStage[]       // active steps in order
    currentStageId: number | null
    isCompleted: boolean
}

/**
 * The whole procurement process at a glance, grouped by phase:
 *   check mark = step passed, dot = current step, empty circle = still to come
 * State is shown by icon AND text weight, not colour alone.
 */
const StageProgress: React.FC<StageProgressProps> = ({ stages, currentStageId, isCompleted }) => {
    const currentOrder = stages.find((s) => s.stage_id === currentStageId)?.sort_order ?? -1

    const stateOf = (stage: WorkflowStage): 'done' | 'current' | 'todo' => {
        if (isCompleted || stage.sort_order < currentOrder) return 'done'
        if (stage.stage_id === currentStageId) return 'current'
        return 'todo'
    }

    // Keep phase order as it appears in the step list
    const phases = stages.reduce<{ group: string; stages: WorkflowStage[] }[]>((acc, stage) => {
        const last = acc[acc.length - 1]
        if (last?.group === stage.stage_group) last.stages.push(stage)
        else acc.push({ group: stage.stage_group, stages: [stage] })
        return acc
    }, [])

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {phases.map((phase) => (
                <div key={phase.group} className="rounded-lg border border-gray-100 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{phase.group}</p>
                    <ol className="space-y-1.5">
                        {phase.stages.map((stage) => {
                            const state = stateOf(stage)
                            return (
                                <li key={stage.stage_id} className="flex items-start gap-2 text-sm">
                                    {state === 'done' && <CircleCheck size={16} className="mt-0.5 shrink-0 text-green-700" aria-label="Done" />}
                                    {state === 'current' && <CircleDot size={16} className="mt-0.5 shrink-0 text-blue-700" aria-label="Current step" />}
                                    {state === 'todo' && <Circle size={16} className="mt-0.5 shrink-0 text-gray-300" aria-label="Not yet" />}
                                    <span className={state === 'current' ? 'font-semibold text-blue-900' : state === 'done' ? 'text-gray-700' : 'text-gray-400'}>
                                        {stage.name}
                                        {state === 'current' && <span className="ml-1 text-xs font-normal text-blue-700">(now)</span>}
                                    </span>
                                </li>
                            )
                        })}
                    </ol>
                </div>
            ))}
        </div>
    )
}

export default StageProgress
