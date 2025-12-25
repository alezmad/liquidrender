import { parseUI, roundtripUI } from './src/compiler/compiler';

/**
 * 5 Unique LiquidCode Admin Panel Snippets
 * Each includes: data tables, filters, role-based visibility, streaming logs
 */
const snippets = [
  // Snippet 1: User Management with Role-Based Access
  `@role @filter
Fm [
  In :username "Search Users" <>search,
  Se :roleFilter "Filter by Role" <>role,
  Bt "Export" !export,
  Bt "Add User" >/1
]
?@role=admin: Tb :users [:id :username :email :role :status] ~1m [
  Ck :selected,
  Tx :.username,
  Tx :.email,
  Tg :.role #?admin:blue,user:gray,
  Sw :.isActive
]
?@role!=admin: Tx "Access Denied"`,

  // Snippet 2: Advanced Data Table with Live Streaming Logs
  `@dateRange @search
0 [
  0 [
    Dt :startDate "From",
    Dt :endDate "To",
    Se :status "Status" <>status
  ]
  Tb :transactions [:id :user :amount :type :timestamp] ~30s [
    Tx :.id,
    Tx :.user,
    Kp :.amount,
    Tg :.type #?success:green,error:red,pending:yellow,
    Tx :.timestamp
  ]
]
/1 9 [Tx "Event Log" Tb :logs [:level :message :time] ~1m]`,

  // Snippet 3: Multi-Role Admin Dashboard with Permissions
  `@role @visibility
?@role=superadmin: 0 [
  Hd "System Admin Dashboard"
  Kp :totalUsers, Kp :activeUsers, Kp :totalRevenue, Kp :systemHealth
  Ln :userGrowth ~5m
  Tb :allUsers [:id :name :role :status :lastLogin] ~2m
  Tb :activityLog [:action :user :timestamp :details] ~1m
]
?@role=admin: 0 [
  Hd "Admin Dashboard"
  Kp :teamUsers, Kp :activeRequests, Kp :pendingApprovals
  Br :departmentStats
  Tb :teamMembers [:id :name :department :role] ~5m
]
?@role=user: 0 [
  Tx "You don't have admin access"
]`,

  // Snippet 4: Real-time Log Streaming with Filters and Role-Based Visibility
  `@severity @component @role
Fm [
  Se :severity "Log Level" <>severity,
  Se :component "Component" <>component,
  In :search "Search Logs" <>searchTerm
]
?@role=admin: Tb :adminLogs [:timestamp :level :component :message :userId :action] ~5s [
  Tx :.timestamp %sm,
  Tg :.level #?error:red,warn:orange,info:blue,debug:gray,
  Tx :.component,
  Tx :.message,
  Tx :.userId,
  Bt "View" !openDetail
]
?@role=viewer: Tb :viewerLogs [:timestamp :level :message] ~30s [
  Tx :.timestamp,
  Tg :.level #?error:red,warn:orange,info:blue,
  Tx :.message
]
?@role!=admin,!=viewer: Tx "Access Denied"`,

  // Snippet 5: Complex User Management Form with Streaming Activity Log
  `@tab @role
Hd "User Management"
0 ^row [
  0 ^col *h [
    Hd "Users"
    Fm [
      In :email "Search Email" <>emailFilter,
      Se :department "Department" <>deptFilter,
      Ck :activeOnly "Active Only" <>activeFilter
    ]
    ?@role=admin: Tb :users [:id :name :email :department :role :joinDate] ~2m [
      Tx :.id %sm,
      Tx :.name,
      Tx :.email,
      Tx :.department,
      Se :.role [Tg "Admin" Tg "Manager" Tg "User"],
      Tx :.joinDate %sm
    ]
  ]
  0 ^col *h [
    Hd "Activity Log"
    Tb :activityLog [:user :action :timestamp :details] ~1m [
      Tx :.user,
      Tg :.action #?create:green,update:blue,delete:red,login:purple,
      Tx :.timestamp %sm,
      Tx :.details
    ]
  ]
]`,
];

console.log('Testing 5 Admin Panel LiquidCode Snippets\n');
console.log('==========================================\n');

let passCount = 0;
let failCount = 0;

for (let i = 0; i < snippets.length; i++) {
  const snippet = snippets[i];
  const snippetNum = i + 1;

  try {
    // Step 1: Parse with parseUI()
    const schema = parseUI(snippet);

    // Step 2: Verify roundtrip with roundtripUI()
    const { isEquivalent, differences } = roundtripUI(schema);

    if (isEquivalent) {
      console.log(`✓ Snippet ${snippetNum}: PASS`);
      console.log(`  Layers: ${schema.layers.length}, Signals: ${schema.signals.length}`);
      passCount++;
    } else {
      console.log(`✗ Snippet ${snippetNum}: FAIL (roundtrip mismatch)`);
      console.log(`  Differences:`);
      differences.forEach(d => console.log(`    - ${d}`));
      failCount++;
    }
  } catch (e) {
    console.log(`✗ Snippet ${snippetNum}: ERROR`);
    console.log(`  ${(e as Error).message}`);
    failCount++;
  }

  console.log();
}

console.log('==========================================');
console.log(`Summary: ${passCount} passed, ${failCount} failed`);
console.log(`Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
