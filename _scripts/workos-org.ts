import { WorkOS } from '@workos-inc/node'

// const workos = new WorkOS(

//   'sk_test_a2V5XzAxSlJHTkMzVlk2MDVNRjJZRzYzWjBTRkpZLEVXbDFVV0FyVXJrYzc4VU13c3JhRUo5Nng'
// )

// const organizations = await workos.organizations.listOrganizations({
//   domains: ['ssli.de']
// })

// console.log(organizations.data)

const workos = new WorkOS(
  'sk_test_a2V5XzAxSlJHTkMzVlk2MDVNRjJZRzYzWjBTRkpZLEVXbDFVV0FyVXJrYzc4VU13c3JhRUo5Nng'
)

const organization = await workos.organizations.createOrganization({
  name: 'Foo Corp',
  domainData: [
    {
      domain: 'foo-corp.com',
      state: 'pending'
    }
  ],
  externalId: '2fe01467-f7ea-4dd2-8b79-c2b4f56d0191',
  metadata: {
    tier: 'diamond'
  }
})
