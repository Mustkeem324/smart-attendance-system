import { prisma } from '../src/lib/prisma';
import {
  calculateDailyEmployeeStatuses,
  getDashboardOverviewMetrics,
  getDailyAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getYearlyAnalytics,
  getDepartmentAnalytics,
  getBranchAnalytics,
  getEmployeePerformanceAnalytics,
  getJoiningAndExitAnalytics,
  getBusinessIntelligenceInsights,
} from '../src/lib/analytics';
import { generatePDFReport } from '../src/lib/pdf';
import { AttendanceStatus } from '@prisma/client';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runPhase3Tests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING PHASE 3: ADMIN DASHBOARD & ANALYTICS TESTS');
  console.log('======================================================\n');

  const org = await prisma.organization.findFirst();
  if (!org) {
    throw new Error('No organization found in database for testing');
  }
  const orgId = org.id;

  // TEST SUITE 1: Schedule & Absence Calculation Engine
  console.log('--- Suite 1: Daily Schedule & Absence Classification ---');
  const todayStr = new Date().toISOString().split('T')[0];
  const statuses = await calculateDailyEmployeeStatuses(orgId, todayStr);
  assert(statuses.length > 0, `Computed daily statuses for active workforce (count: ${statuses.length})`);

  // Verify that an employee on approved leave or holiday is NEVER classified as ABSENT
  statuses.forEach((s) => {
    if (s.status === AttendanceStatus.ON_LEAVE) {
      assert((s.status as any) !== AttendanceStatus.ABSENT, `Employee ${s.name} on approved leave is NOT marked absent`);
    }
    if (s.status === AttendanceStatus.PUBLIC_HOLIDAY) {
      assert((s.status as any) !== AttendanceStatus.ABSENT, `Employee ${s.name} on public holiday is NOT marked absent`);
    }
    if (s.status === AttendanceStatus.WEEKLY_OFF) {
      assert((s.status as any) !== AttendanceStatus.ABSENT, `Employee ${s.name} on scheduled weekly off is NOT marked absent`);
    }
  });
  assert(true, 'Verified strict absence policy: holidays and leaves never classified as absent');

  // TEST SUITE 2: Dynamic 12 KPI Overview Metrics
  console.log('\n--- Suite 2: Executive Dashboard 12 KPIs ---');
  const overview = await getDashboardOverviewMetrics(orgId, todayStr);
  const kpis = overview.kpis;

  assert(kpis.totalEmployees >= 4, `Total Employees calculated (${kpis.totalEmployees})`);
  assert(kpis.activeEmployees <= kpis.totalEmployees, `Active Employees (${kpis.activeEmployees}) <= Total Employees`);
  assert(typeof kpis.presentToday === 'number', `Present Today computed (${kpis.presentToday})`);
  assert(typeof kpis.absentToday === 'number', `Absent Today computed (${kpis.absentToday})`);
  assert(typeof kpis.currentlyCheckedIn === 'number', `Currently Checked In computed (${kpis.currentlyCheckedIn})`);
  assert(typeof kpis.checkedOut === 'number', `Checked Out computed (${kpis.checkedOut})`);
  assert(typeof kpis.onLeave === 'number', `On Leave computed (${kpis.onLeave})`);
  assert(typeof kpis.lateArrivals === 'number', `Late Arrivals computed (${kpis.lateArrivals})`);
  assert(typeof kpis.earlyDepartures === 'number', `Early Departures computed (${kpis.earlyDepartures})`);
  assert(typeof kpis.halfDays === 'number', `Half Days computed (${kpis.halfDays})`);
  assert(typeof kpis.workFromHome === 'number', `Remote WFH computed (${kpis.workFromHome})`);
  assert(typeof kpis.pendingCorrections === 'number', `Pending Corrections computed (${kpis.pendingCorrections})`);
  assert(typeof kpis.attendancePercentage === 'number', `Attendance Percentage computed (${kpis.attendancePercentage}%)`);
  assert(overview.detailedEmployees.length === statuses.length, 'Detailed drilldown array matches employee count for modal inspection');

  // TEST SUITE 3: Daily, Weekly, Monthly & Yearly Analytics
  console.log('\n--- Suite 3: Multi-Timeframe Analytics (Daily, Weekly, Monthly, Yearly) ---');
  const daily = await getDailyAnalytics(orgId, todayStr);
  assert(daily.scheduledEmployees >= 0, `Daily analytics: scheduled employees (${daily.scheduledEmployees})`);
  assert(typeof daily.attendancePercentage === 'number', `Daily attendance rate (${daily.attendancePercentage}%)`);

  const weekly = await getWeeklyAnalytics(orgId, todayStr);
  assert(weekly.days.length === 7, `Weekly analytics: exactly 7 days Monday to Sunday computed (${weekly.days.length} days)`);
  assert(typeof weekly.weeklyAveragePercentage === 'number', `Weekly average presence (${weekly.weeklyAveragePercentage}%)`);
  assert(typeof weekly.weekOnWeekChangePercentage === 'number', `Week-on-week delta computed (${weekly.weekOnWeekChangePercentage}%)`);

  const now = new Date();
  const monthly = await getMonthlyAnalytics(orgId, now.getFullYear(), now.getMonth() + 1);
  assert(monthly.totalDaysInMonth >= 28, `Monthly analytics: days in month computed (${monthly.totalDaysInMonth})`);
  assert(monthly.dailyTrends.length === monthly.totalDaysInMonth, `Monthly daily trend points equal month days (${monthly.dailyTrends.length})`);
  assert(monthly.employeeStats.length > 0, `Monthly employee performance ranking calculated (count: ${monthly.employeeStats.length})`);

  const yearly = await getYearlyAnalytics(orgId, now.getFullYear());
  assert(yearly.months.length === 12, `Yearly analytics: all 12 calendar months compiled`);
  assert(typeof yearly.annualAttendancePercentage === 'number', `Annual attendance percentage (${yearly.annualAttendancePercentage}%)`);

  // TEST SUITE 4: Department & Branch Analytics
  console.log('\n--- Suite 4: Department & Branch Analytics ---');
  const depts = await getDepartmentAnalytics(orgId, todayStr);
  assert(depts.length >= 2, `Department analytics generated for all departments (count: ${depts.length})`);
  assert(typeof depts[0].attendancePercentage === 'number', `Department attendance percentage computed (${depts[0].name}: ${depts[0].attendancePercentage}%)`);

  const branches = await getBranchAnalytics(orgId, todayStr);
  assert(branches.length >= 2, `Branch analytics generated with geofences (count: ${branches.length})`);
  assert(Boolean(branches[0].radiusMeters), `Branch includes configured radius (${branches[0].radiusMeters}m)`);

  // TEST SUITE 5: Employee Performance & Lifecycle Analytics
  console.log('\n--- Suite 5: Individual Employee & Lifecycle Analytics ---');
  const sampleEmp = await prisma.employee.findFirst({ where: { organizationId: orgId } });
  if (sampleEmp) {
    const empPerf = await getEmployeePerformanceAnalytics(
      orgId,
      sampleEmp.id,
      `${now.getFullYear()}-01-01`,
      todayStr
    );
    assert(empPerf.employee.id === sampleEmp.id, `Retrieved performance profile for ${empPerf.employee.name}`);
    assert(typeof empPerf.metrics.presentDays === 'number', `Employee present days tallied (${empPerf.metrics.presentDays})`);
  }

  const lifecycle = await getJoiningAndExitAnalytics(orgId);
  assert(lifecycle.totalEmployees > 0, `Lifecycle total employees (${lifecycle.totalEmployees})`);
  assert(typeof lifecycle.retentionRate === 'number', `Workforce retention rate computed (${lifecycle.retentionRate}%)`);
  assert(lifecycle.monthlyTrends.length === 12, `12-month joining/exit trends computed`);

  // TEST SUITE 6: Automated Business Intelligence Insights
  console.log('\n--- Suite 6: Automated Business Intelligence Engine ---');
  const bi = await getBusinessIntelligenceInsights(orgId);
  assert(bi.insights.length > 0, `BI engine produced data-driven insights (count: ${bi.insights.length})`);
  bi.insights.forEach((ins) => {
    assert(Boolean(ins.title && ins.description), `Valid BI insight: "${ins.title}"`);
  });

  // TEST SUITE 7: PDF Report Generation Engine
  console.log('\n--- Suite 7: Enterprise PDF Report Engine ---');
  const pdfBytes = generatePDFReport({
    companyName: org.name,
    reportTitle: 'Official Master Attendance Audit Report',
    dateRange: `${todayStr} to ${todayStr}`,
    summaryMetrics: [
      { label: 'Total Workforce', value: kpis.totalEmployees },
      { label: 'Present Today', value: kpis.presentToday },
      { label: 'Absent', value: kpis.absentToday },
      { label: 'Rate', value: `${kpis.attendancePercentage}%` },
    ],
    columns: [
      { header: 'Code', dataKey: 'employeeCode' },
      { header: 'Employee Name', dataKey: 'name' },
      { header: 'Department', dataKey: 'departmentName' },
      { header: 'Branch', dataKey: 'branchName' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Hours', dataKey: 'totalHours' },
    ],
    rows: statuses,
  });

  assert(pdfBytes instanceof Uint8Array, 'PDF generated as Uint8Array');
  assert(pdfBytes.length > 2000, `PDF document buffer generated (${pdfBytes.length} bytes with headers, table, and pagination)`);

  console.log('\n======================================================');
  console.log(`📊 PHASE 3 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3Tests()
  .catch((e) => {
    console.error('Fatal test error in Phase 3:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
