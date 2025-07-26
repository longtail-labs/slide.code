import { createFileRoute } from '@tanstack/react-router'
// import { queryClient, trpcClient, trpcReact } from '../clients/trpcClient'
import PlanningView from '../screens/Planning/PlanningScreen.js'

export const Route = createFileRoute('/')({
  component: PlanningView
})
