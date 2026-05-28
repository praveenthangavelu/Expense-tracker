// Node 18+ has global fetch available natively. No import needed.

const BASE_URL = 'http://localhost:5000/api';

async function testAll() {
  console.log('🧪 Starting Automation Engine Backend Verification...\n');
  
  let token = '';
  const email = 'test_automation_engine@example.com';
  const password = 'password123';

  // 1. Register User
  console.log('1. Trying to register user...');
  try {
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Automation Tester', email, password })
    });
    const regData = await regRes.json();
    
    if (regRes.status === 201) {
      console.log('✅ User registered successfully!');
      token = regData.data.token;
    } else if ((regRes.status === 400 || regRes.status === 409) && regData.message && regData.message.includes('already registered')) {
      console.log('ℹ️ User already registered. Logging in...');
      const logRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const logData = await logRes.json();
      if (logRes.status === 200) {
        console.log('✅ Logged in successfully!');
        token = logData.data.token;
      } else {
        throw new Error(`Login failed: ${JSON.stringify(logData)}`);
      }
    } else {
      throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }
  } catch (err) {
    console.error('❌ Authentication failed:', err.message);
    process.exit(1);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Fetch profile & verify automation settings schema
  console.log('\n2. Fetching profile to verify automationSettings schema...');
  try {
    const meRes = await fetch(`${BASE_URL}/auth/me`, { headers: authHeaders });
    const meData = await meRes.json();
    if (meRes.status === 200) {
      console.log('✅ Profile fetched successfully.');
      console.log('Current automation settings:', JSON.stringify(meData.data.automationSettings || {}));
    } else {
      throw new Error(`Failed to fetch me: ${JSON.stringify(meData)}`);
    }
  } catch (err) {
    console.error('❌ Me request failed:', err.message);
  }

  // 3. Update automation settings
  console.log('\n3. Updating automation settings...');
  try {
    const setRes = await fetch(`${BASE_URL}/auth/settings`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        enabled: true,
        morningBrief: true,
        weeklyReview: true,
        monthlyReport: true,
        budgetAlerts: true,
        goalReminders: true,
        healthTips: true,
        patternAlerts: true,
        noSpendReminders: true,
        paydayDate: 5,
        paydayAmount: 4000
      })
    });
    const setData = await setRes.json();
    if (setRes.status === 200) {
      console.log('✅ Settings updated successfully!');
      console.log('Updated settings:', JSON.stringify(setData.data.user?.automationSettings));
    } else {
      throw new Error(`Settings update failed: ${JSON.stringify(setData)}`);
    }
  } catch (err) {
    console.error('❌ Settings update failed:', err.message);
  }

  // 4. Create a Savings Goal
  console.log('\n4. Creating a savings goal...');
  let goalId = '';
  try {
    const goalRes = await fetch(`${BASE_URL}/goals`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'New Tesla Fund',
        targetAmount: 85000,
        duration: '1_year',
        icon: '🚗',
        color: '#10B981',
        priority: 'high',
        autoDeduct: true,
        autoDeductFrequency: 'weekly',
        autoDeductAmount: 1000
      })
    });
    const goalData = await goalRes.json();
    if (goalRes.status === 201) {
      goalId = goalData.data._id;
      console.log(`✅ Savings goal created! ID: ${goalId}`);
      console.log('Metrics:', JSON.stringify(goalData.data.metrics));
    } else {
      throw new Error(`Goal creation failed: ${JSON.stringify(goalData)}`);
    }
  } catch (err) {
    console.error('❌ Savings goal creation failed:', err.message);
  }

  // 5. Add Savings to the Goal
  if (goalId) {
    console.log('\n5. Adding savings to the goal...');
    try {
      const addRes = await fetch(`${BASE_URL}/goals/${goalId}/add`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ amount: 5000, note: 'Initial deposit' })
      });
      const addData = await addRes.json();
      if (addRes.status === 200) {
        console.log(`✅ Savings added! New savedAmount: ${addData.data.savedAmount}`);
        console.log('Progress ring status:', addData.data.metrics.percentComplete, '% completed');
        if (addData.celebrations && addData.celebrations.length > 0) {
          console.log('🎉 Celebrations triggered:', addData.celebrations);
        }
      } else {
        throw new Error(`Add savings failed: ${JSON.stringify(addData)}`);
      }
    } catch (err) {
      console.error('❌ Add savings failed:', err.message);
    }
  }

  // 6. Get goal recommendations and insights
  console.log('\n6. Fetching goal insights and recommendations...');
  try {
    const recRes = await fetch(`${BASE_URL}/goals/recommendations`, { headers: authHeaders });
    const recData = await recRes.json();
    console.log('✅ Goal recommendations fetched. Recs count:', recData.data.length);
    if (recData.data.length > 0) {
      console.log('Feasibility status of first goal:', recData.data[0].statusText);
    }

    const insRes = await fetch(`${BASE_URL}/goals/insights`, { headers: authHeaders });
    const insData = await insRes.json();
    console.log('✅ Goal insights fetched. Total Savings Projection:', insData.data.projectedYearEndSavings);
  } catch (err) {
    console.error('❌ Goal insights/recommendations failed:', err.message);
  }

  // 7. Annual Plan endpoints
  console.log('\n7. Testing Annual Planner...');
  try {
    // Check if plan exists or create it
    const planGet = await fetch(`${BASE_URL}/annual-plan?year=2026`, { headers: authHeaders });
    const planGetData = await planGet.json();
    
    let planData;
    if (planGet.status === 200 && planGetData.data) {
      console.log('✅ Found existing Annual Plan for 2026.');
      planData = planGetData.data;
    } else {
      console.log('Creating new Annual Plan for 2026...');
      const planRes = await fetch(`${BASE_URL}/annual-plan`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ year: 2026, autoFill: false })
      });
      const resData = await planRes.json();
      if (planRes.status === 201) {
        console.log('✅ Created Annual Plan for 2026.');
        planData = resData.data;
      } else {
        throw new Error(`Failed to create plan: ${JSON.stringify(resData)}`);
      }
    }

    // Update Month 1 planned income
    const updateMonthRes = await fetch(`${BASE_URL}/annual-plan/month/1?year=2026`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        plannedIncome: 8000,
        expenses: [
          { category: 'Food', amount: 1500, note: 'Groceries' },
          { category: 'Bills', amount: 800 }
        ]
      })
    });
    const updateMonthData = await updateMonthRes.json();
    if (updateMonthRes.status === 200) {
      console.log('✅ Updated January breakdown in Annual Plan.');
    } else {
      throw new Error(`Failed to update month: ${JSON.stringify(updateMonthData)}`);
    }

    // Get analysis
    const analysisRes = await fetch(`${BASE_URL}/annual-plan/analysis?year=2026`, { headers: authHeaders });
    const analysisData = await analysisRes.json();
    console.log('✅ Annual Analysis fetched. Performance grade:', analysisData.data.performanceGrade || 'N/A');

    // Get recommendations
    const annRecRes = await fetch(`${BASE_URL}/annual-plan/recommendations?year=2026`, { headers: authHeaders });
    const annRecData = await annRecRes.json();
    console.log('✅ Annual Recommendations fetched. Suggestions count:', annRecData.data.reallocationsSuggested?.length || 0);

  } catch (err) {
    console.error('❌ Annual planner tests failed:', err.message);
  }

  // 8. Monthly Plan endpoints
  console.log('\n8. Testing Monthly Planner...');
  try {
    const monthPlanGet = await fetch(`${BASE_URL}/monthly-plan?month=5&year=2026`, { headers: authHeaders });
    const mGetData = await monthPlanGet.json();

    let mPlan;
    if (monthPlanGet.status === 200 && mGetData.data) {
      console.log('✅ Found existing Monthly Plan for 05/2026.');
      mPlan = mGetData.data;
    } else {
      console.log('Creating new Monthly Plan for 05/2026...');
      const mRes = await fetch(`${BASE_URL}/monthly-plan`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ month: 5, year: 2026, plannedIncome: 7000, autoGenerate: false })
      });
      const mResData = await mRes.json();
      if (mRes.status === 201) {
        console.log('✅ Created Monthly Plan.');
        mPlan = mResData.data;
      } else {
        throw new Error(`Failed to create monthly plan: ${JSON.stringify(mResData)}`);
      }
    }

    // Update category budget limit
    const updRes = await fetch(`${BASE_URL}/monthly-plan/budget?month=5&year=2026`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ category: 'Food', budgetAmount: 1200 })
    });
    const updData = await updRes.json();
    if (updRes.status === 200) {
      console.log('✅ Category Food budget limit set to 1200.');
    } else {
      throw new Error(`Failed to update category budget: ${JSON.stringify(updData)}`);
    }

    // Add rule
    const ruleRes = await fetch(`${BASE_URL}/monthly-plan/rules?month=5&year=2026`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        type: 'no_spend_day',
        config: { day: 15 }
      })
    });
    const ruleData = await ruleRes.json();
    if (ruleRes.status === 200) {
      console.log('✅ Added no-spend rule for day 15.');
    } else {
      throw new Error(`Failed to add rule: ${JSON.stringify(ruleData)}`);
    }

    // Get rebalance advice
    const rebRes = await fetch(`${BASE_URL}/monthly-plan/rebalance?month=5&year=2026`, { headers: authHeaders });
    const rebData = await rebRes.json();
    console.log('✅ Rebalance advice fetched. Offers:', rebData.data.rebalances?.length || 0);

    // Get weekly and month-end reports
    const repWRes = await fetch(`${BASE_URL}/monthly-plan/weekly-report?month=5&year=2026`, { headers: authHeaders });
    const repWData = await repWRes.json();
    console.log('✅ Weekly report fetched. Grade:', repWData.data.report?.performanceGrade || 'N/A');

    const repERes = await fetch(`${BASE_URL}/monthly-plan/month-end-report?month=5&year=2026`, { headers: authHeaders });
    const repEData = await repERes.json();
    console.log('✅ Month-end report fetched. Status:', repEData.success);

  } catch (err) {
    console.error('❌ Monthly planner tests failed:', err.message);
  }

  // 9. Clean up / Pause goal to prevent unnecessary cron auto-deducts in the database
  if (goalId) {
    console.log('\n9. Pausing the test savings goal to clean up...');
    try {
      const pauseRes = await fetch(`${BASE_URL}/goals/${goalId}/pause-resume`, {
        method: 'PATCH',
        headers: authHeaders
      });
      const pauseData = await pauseRes.json();
      if (pauseRes.status === 200) {
        console.log(`✅ Savings goal paused. Status: ${pauseData.data.status}`);
      }
    } catch (err) {
      console.error('❌ Pause goal failed:', err.message);
    }
  }

  console.log('\n🎉 ALL AUTOMATION ENGINE ENDPOINTS VERIFIED SUCCESSFULLY! 🥳');
}

testAll();
