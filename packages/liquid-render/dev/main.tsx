import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { parseUI } from '../src/compiler/ui-compiler';
import { LiquidUI } from '../src/renderer/LiquidUI';

// Import static components for direct testing
import {
  StaticButton,
  StaticText,
  StaticContainer,
  SimpleCard,
  StaticTable,
  StaticLineChart,
  StaticBarChart,
  StaticPieChart,
  ControlledModal,
  useModal,
  ControlledInput,
  SearchInput,
  ControlledForm,
  FormField,
  FormRow,
  FormActions,
} from '../src/renderer/components';

// ============================================================================
// Sample Data
// ============================================================================

const dashboardData = {
  summary: {
    revenue: 832000,
    orders: 2248,
    customers: 1694,
    growth: 0.14,
  },
  monthly: [
    { month: 'Jan', revenue: 45000, orders: 120, profit: 12000 },
    { month: 'Feb', revenue: 52000, orders: 145, profit: 15000 },
    { month: 'Mar', revenue: 48000, orders: 132, profit: 11000 },
    { month: 'Apr', revenue: 61000, orders: 168, profit: 18000 },
    { month: 'May', revenue: 58000, orders: 155, profit: 16000 },
    { month: 'Jun', revenue: 67000, orders: 182, profit: 21000 },
  ],
  categories: [
    { name: 'Electronics', value: 45000 },
    { name: 'Clothing', value: 32000 },
    { name: 'Home', value: 28000 },
    { name: 'Sports', value: 18000 },
    { name: 'Other', value: 12000 },
  ],
  transactions: [
    { date: '2024-06-15', customer: 'Acme Corp', amount: 12500, status: 'Completed' },
    { date: '2024-06-14', customer: 'TechStart', amount: 8900, status: 'Completed' },
    { date: '2024-06-14', customer: 'Global Inc', amount: 15200, status: 'Pending' },
    { date: '2024-06-13', customer: 'StartupXYZ', amount: 4500, status: 'Completed' },
    { date: '2024-06-12', customer: 'MegaCorp', amount: 28000, status: 'Completed' },
  ],
};

// ============================================================================
// DSL Examples
// ============================================================================

const dslExamples = {
  dashboard: `Kp :summary
Ln :monthly
Br :monthly
Tb :transactions`,

  signals: `@tab
Cn ^r [
  Bt "Overview" >tab=0
  Bt "Charts" >tab=1
  Bt "Table" >tab=2
]
?@tab=0 Kp :summary
?@tab=1 Ln :monthly
?@tab=2 Tb :transactions`,

  styled: `Kp :revenue "Total Revenue" #green
Kp :orders "Total Orders" #blue
Br :monthly "Monthly Performance"
Pi :categories "By Category"`,
};

// ============================================================================
// Section Component
// ============================================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '3rem' }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 600,
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: '2px solid #e5e7eb'
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

// ============================================================================
// App
// ============================================================================

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const modal = useModal();

  const tabs = ['DSL Rendering', 'Static Components', 'Forms & Inputs', 'Interactive'];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        LiquidCode Component Showcase
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Production-ready components with shadcn-inspired design system
      </p>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {tabs.map((tab, i) => (
          <StaticButton
            key={tab}
            label={tab}
            variant={activeTab === i ? 'default' : 'outline'}
            onClick={() => setActiveTab(i)}
          />
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 0 && (
        <>
          <Section title="1. Dashboard DSL">
            <pre style={{
              background: '#1f2937',
              color: '#10b981',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
            }}>
              {dslExamples.dashboard}
            </pre>
            <LiquidUI schema={parseUI(dslExamples.dashboard)} data={dashboardData} />
          </Section>

          <Section title="2. Signal-based Tabs DSL">
            <pre style={{
              background: '#1f2937',
              color: '#10b981',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
            }}>
              {dslExamples.signals}
            </pre>
            <LiquidUI
              schema={parseUI(dslExamples.signals)}
              data={dashboardData}
              onSignalChange={(signal, value) => console.log('Signal:', signal, '=', value)}
            />
          </Section>

          <Section title="3. Styled Components DSL">
            <pre style={{
              background: '#1f2937',
              color: '#10b981',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
            }}>
              {dslExamples.styled}
            </pre>
            <LiquidUI
              schema={parseUI(dslExamples.styled)}
              data={{
                revenue: 832000,
                orders: 2248,
                monthly: dashboardData.monthly,
                categories: dashboardData.categories,
              }}
            />
          </Section>
        </>
      )}

      {activeTab === 1 && (
        <>
          <Section title="Button Variants">
            <StaticContainer direction="row" gap="sm" wrap>
              <StaticButton label="Default" variant="default" />
              <StaticButton label="Secondary" variant="secondary" />
              <StaticButton label="Outline" variant="outline" />
              <StaticButton label="Ghost" variant="ghost" />
              <StaticButton label="Destructive" variant="destructive" />
            </StaticContainer>
            <div style={{ marginTop: '1rem' }}>
              <StaticContainer direction="row" gap="sm" wrap>
                <StaticButton label="Small" size="sm" />
                <StaticButton label="Medium" size="md" />
                <StaticButton label="Large" size="lg" />
              </StaticContainer>
            </div>
          </Section>

          <Section title="Typography">
            <StaticContainer gap="sm">
              <StaticText variant="heading">Heading Text</StaticText>
              <StaticText variant="subheading">Subheading Text</StaticText>
              <StaticText variant="body">Body text - The quick brown fox jumps over the lazy dog.</StaticText>
              <StaticText variant="caption" color="muted">Caption text with muted color</StaticText>
              <StaticText variant="code">const code = "inline code";</StaticText>
            </StaticContainer>
          </Section>

          <Section title="Cards">
            <StaticContainer direction="row" gap="md" wrap>
              <SimpleCard title="Simple Card" description="With description">
                <StaticText>Card content goes here.</StaticText>
              </SimpleCard>
              <SimpleCard title="With Footer" footer={<StaticButton label="Action" size="sm" />}>
                <StaticText>Another card with a footer action button.</StaticText>
              </SimpleCard>
            </StaticContainer>
          </Section>

          <Section title="Data Table">
            <StaticTable
              data={dashboardData.transactions}
              title="Recent Transactions"
              sortable
              striped
            />
          </Section>

          <Section title="Charts">
            <StaticContainer direction="row" gap="md" wrap>
              <div style={{ flex: '1 1 400px' }}>
                <StaticLineChart
                  data={dashboardData.monthly}
                  xKey="month"
                  lines={[
                    { dataKey: 'revenue', stroke: '#3b82f6', name: 'Revenue' },
                    { dataKey: 'profit', stroke: '#22c55e', name: 'Profit' },
                  ]}
                  title="Revenue & Profit Trend"
                />
              </div>
              <div style={{ flex: '1 1 400px' }}>
                <StaticBarChart
                  data={dashboardData.monthly}
                  xKey="month"
                  bars={[{ dataKey: 'orders', name: 'Orders' }]}
                  title="Monthly Orders"
                />
              </div>
            </StaticContainer>
            <div style={{ marginTop: '1rem', maxWidth: '400px' }}>
              <StaticPieChart
                data={dashboardData.categories}
                nameKey="name"
                valueKey="value"
                title="Sales by Category"
              />
            </div>
          </Section>
        </>
      )}

      {activeTab === 2 && (
        <>
          <Section title="Input Variants">
            <StaticContainer gap="md" style={{ maxWidth: '400px' }}>
              <ControlledInput label="Default Input" placeholder="Enter text..." />
              <ControlledInput label="With Error" error="This field is required" />
              <ControlledInput label="With Hint" hint="We'll never share your email" type="email" />
              <SearchInput label="Search" placeholder="Search..." />
            </StaticContainer>
          </Section>

          <Section title="Form Example">
            <SimpleCard title="Contact Form" style={{ maxWidth: '500px' }}>
              <ControlledForm
                onSubmit={(values) => {
                  console.log('Form submitted:', values);
                  alert('Form submitted! Check console.');
                }}
              >
                <FormRow>
                  <FormField name="firstName" label="First Name" required>
                    <ControlledInput placeholder="John" />
                  </FormField>
                  <FormField name="lastName" label="Last Name" required>
                    <ControlledInput placeholder="Doe" />
                  </FormField>
                </FormRow>
                <FormField name="email" label="Email" required>
                  <ControlledInput type="email" placeholder="john@example.com" />
                </FormField>
                <FormField name="message" label="Message">
                  <ControlledInput placeholder="Your message..." />
                </FormField>
                <FormActions>
                  <StaticButton label="Cancel" variant="outline" />
                  <StaticButton label="Submit" />
                </FormActions>
              </ControlledForm>
            </SimpleCard>
          </Section>
        </>
      )}

      {activeTab === 3 && (
        <>
          <Section title="Modal">
            <StaticButton label="Open Modal" onClick={modal.open} />
            <ControlledModal
              isOpen={modal.isOpen}
              onClose={modal.close}
              title="Example Modal"
              footer={
                <>
                  <StaticButton label="Cancel" variant="outline" onClick={modal.close} />
                  <StaticButton label="Confirm" onClick={modal.close} />
                </>
              }
            >
              <StaticText>
                This is a modal dialog with focus trap, escape key handling, and overlay click to close.
              </StaticText>
            </ControlledModal>
          </Section>

          <Section title="Live Signal Demo">
            <StaticText variant="caption" color="muted">
              Click the buttons below to switch content using LiquidCode signals:
            </StaticText>
            <div style={{ marginTop: '1rem' }}>
              <LiquidUI
                schema={parseUI(`@view
Cn ^r [
  Bt "KPIs" >view=kpi #blue
  Bt "Chart" >view=chart #green
  Bt "Table" >view=table #purple
]
?@view=kpi Kp :summary
?@view=chart Ln :monthly
?@view=table Tb :transactions`)}
                data={dashboardData}
                initialSignals={{ view: 'kpi' }}
                onSignalChange={(signal, value) => {
                  console.log(`Signal changed: ${signal} = ${value}`);
                }}
              />
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
