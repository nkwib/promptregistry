import { customerSummary } from '../prompts/.generated/registry.js'

// This is typed: missing a variable is a tsc error
const output = customerSummary.with({
  customerName: 'Ada',
  planTier: 'Pro',
  joinDate: '2024-01-15',
})

console.log(output)
