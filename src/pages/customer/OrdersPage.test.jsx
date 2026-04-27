// =========================
// IMPORTS
// =========================
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrdersPage from './OrdersPage';
import { useAuth } from '../../context/AuthContext';

// =========================
// MOCKS
// =========================

// -- Auth context
jest.mock('../../context/AuthContext');

// -- React Router
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// -- Lucide icons (no-op renders, same as cart test)
jest.mock('lucide-react', () => ({
  ShoppingCart:  () => null,
  Upload:        () => null,
  ClipboardList: () => null,
  Clock:         () => null,
}));

// -- Theme (same shape as cart mock)
jest.mock('../../components/profile/profileTheme', () => ({
  C: {
    bg:         '#fff',
    border:     '#ccc',
    textMuted:  '#aaa',
    accent:     '#000',
    accentShadow: 'none',
  },
  FONT: { body: 'sans-serif' },
}));

// -- Shared UI components
jest.mock('../../components/profile/PageBanner', () => ({
  __esModule: true,
  default: ({ title, subtitle, children }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}));

jest.mock('../../components/orders/OrderCard', () => ({
  __esModule: true,
  default: ({ order }) => (
    <div data-testid="order-card">
      <span>{order.customerName}</span>
      <span data-testid={`order-type-${order.id}`}>{order.type}</span>
      <span data-testid={`order-status-${order.id}`}>{order.orderStatus}</span>
    </div>
  ),
}));

// -- Route constants
jest.mock('../../components/utils/constants', () => ({
  ROUTES: {
    CUSTOMER_PRESCRIPTION: '/customer/prescription',
  },
}));

// -- Block jest from ever parsing firebase.js (contains import.meta.env / Vite syntax)
// These must be mocked before AuthContext is resolved, otherwise Jest
// tries to parse the real file and crashes on `import.meta`.
jest.mock('../../services/firebase', () => ({
  auth: {},
  db:   {},
}));

// Also cover the alias used inside OrdersPage itself
jest.mock('../../lib/firebase', () => ({
  auth: {},
  db:   {},
}));

// firebase/auth — AuthContext calls onAuthStateChanged etc.
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  getAuth:            jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut:            jest.fn(),
}));

// firebase/firestore — used by OrdersPage directly
jest.mock('firebase/firestore', () => ({
  collection:  jest.fn(),
  onSnapshot:  jest.fn(),
  query:       jest.fn(),
  orderBy:     jest.fn(),
  getFirestore: jest.fn(),
}));

// firebase/app — prevents any top-level initializeApp parse errors
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps:       jest.fn(() => []),
  getApp:        jest.fn(() => ({})),
}));

// =========================
// TEST DATA
// =========================
const mockNavigate = jest.fn();

// Regular orders returned by the NestJS backend fetch
const mockOrders = [
  {
    id:            'order1',
    customerName:  'John Doe',
    orderStatus:   'pending',
    createdAt:     { seconds: 1700000200 },
  },
  {
    id:            'order2',
    customerName:  'Jane Smith',
    orderStatus:   'delivered',
    createdAt:     { seconds: 1700000100 },
  },
];

// Prescription documents returned by Firestore onSnapshot
const mockPrescriptions = [
  {
    id:              'pres1',
    userId:          'user123',
    customerName:    'John Doe',
    customerPhone:   '+94771234567',
    customerAddress: '123 Main St',
    status:          'Pending',
    medications:     [{ name: 'Panadol', qty: 2, price: 150 }],
    createdAt:       { seconds: 1700000050 },
  },
];

// =========================
// HELPERS
// =========================

/**
 * Sets up the Firestore onSnapshot mock to immediately call its callback
 * with the provided prescription documents.
 */
const setupFirestoreMock = (prescriptions = mockPrescriptions) => {
  const { onSnapshot } = require('firebase/firestore');
  onSnapshot.mockImplementation((_query, callback) => {
    callback({
      docs: prescriptions.map(p => ({
        id:   p.id,
        data: () => ({ ...p }),
      })),
    });
    return jest.fn(); // unsubscribe function
  });
};

/**
 * Sets up the global fetch mock to return the provided orders array.
 */
const setupFetchMock = (orders = mockOrders) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok:   true,
    json: jest.fn().mockResolvedValue(orders),
  });
};

/**
 * Sets up the useAuth mock with a realistic currentUser object.
 */
const setupAuthMock = (overrides = {}) => {
  useAuth.mockReturnValue({
    currentUser: {
      uid:         'user123',
      phoneNumber: '+94771234567',
      getIdToken:  jest.fn().mockResolvedValue('mock-token'),
      ...overrides,
    },
  });
};

const renderOrders = () => render(<OrdersPage />);

// =========================
// TEST SUITE — ORDERS PAGE
// =========================
describe('OrdersPage', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear prescription IDs stored in localStorage between tests
    localStorage.clear();
    setupAuthMock();
    setupFetchMock();
    setupFirestoreMock();
  });

  // =========================
  // RENDERING TESTS
  // =========================
  it('renders the page banner with correct title and subtitle', async () => {
    renderOrders();
    await waitFor(() => {
      expect(screen.getByText('My Orders & Activity')).toBeInTheDocument();
      expect(
        screen.getByText('Track your regular orders and prescription approvals in real-time.')
      ).toBeInTheDocument();
    });
  });

  it('renders all merged order and prescription cards', async () => {
    renderOrders();
    await waitFor(() => {
      // 2 regular orders + 1 prescription = 3 cards
      expect(screen.getAllByTestId('order-card')).toHaveLength(3);
    });
  });

  it('renders regular order cards with type "regular"', async () => {
    renderOrders();
    await waitFor(() => {
      expect(screen.getByTestId('order-type-order1')).toHaveTextContent('regular');
    });
  });

  it('renders prescription cards with type "prescription"', async () => {
    renderOrders();
    await waitFor(() => {
      expect(screen.getByTestId('order-type-pres1')).toHaveTextContent('prescription');
    });
  });

  it('shows empty state when user has no orders or prescriptions', async () => {
    setupFetchMock([]);
    setupFirestoreMock([]);
    renderOrders();
    await waitFor(() => {
      expect(screen.getByText('No Activity Yet')).toBeInTheDocument();
    });
  });

  // =========================
  // LOADING STATE TESTS
  // =========================
  it('shows loading spinner before data is fetched', () => {
    // Delay fetch resolution so loading state is visible
    global.fetch = jest.fn().mockImplementation(
      () => new Promise(() => {}) // never resolves
    );
    renderOrders();
    expect(screen.getByText(/Syncing Live Data/i)).toBeInTheDocument();
  });

  it('hides loading spinner after data arrives', async () => {
    renderOrders();
    await waitFor(() => {
      expect(screen.queryByText(/Syncing Live Data/i)).not.toBeInTheDocument();
    });
  });

  // =========================
  // DATA FETCHING TESTS
  // =========================
  it('fetches orders from the NestJS backend on mount', async () => {
    renderOrders();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('userId=user123'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer mock-token' }),
        })
      );
    });
  });

  it('does not fetch when currentUser is absent', () => {
    useAuth.mockReturnValue({ currentUser: null });
    renderOrders();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('skips loading and shows empty state when currentUser is null', async () => {
    useAuth.mockReturnValue({ currentUser: null });
    setupFirestoreMock([]);
    renderOrders();
    await waitFor(() => {
      expect(screen.getByText('No Activity Yet')).toBeInTheDocument();
    });
  });

  it('defaults orderStatus to "pending" when backend omits it', async () => {
    setupFetchMock([{ id: 'order3', customerName: 'Bob', createdAt: { seconds: 1700000300 } }]);
    setupFirestoreMock([]);
    renderOrders();
    await waitFor(() => {
      expect(screen.getByTestId('order-status-order3')).toHaveTextContent('pending');
    });
  });

  it('handles a failed backend fetch gracefully without crashing', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, text: jest.fn().mockResolvedValue('Server Error') });
    setupFirestoreMock([]);
    renderOrders();
    await waitFor(() => {
      expect(screen.getByText('No Activity Yet')).toBeInTheDocument();
    });
  });

  // =========================
  // PRESCRIPTION FILTERING TESTS
  // =========================
  it('matches prescriptions to user via userId (strategy a)', async () => {
    renderOrders();
    await waitFor(() => {
      expect(screen.getByTestId('order-type-pres1')).toBeInTheDocument();
    });
  });

  it('matches prescriptions to user via localStorage IDs (strategy b)', async () => {
    // Override userId so strategy-a fails, but localStorage has the ID
    setupFirestoreMock([{ ...mockPrescriptions[0], userId: 'other-user' }]);
    localStorage.setItem('my_prescriptions', JSON.stringify(['pres1']));
    renderOrders();
    await waitFor(() => {
      expect(screen.getByTestId('order-type-pres1')).toBeInTheDocument();
    });
  });

  it('matches prescriptions to user via phone number (strategy c)', async () => {
    setupFirestoreMock([{ ...mockPrescriptions[0], userId: 'other-user' }]);
    // No localStorage entry — falls through to phone match
    renderOrders();
    await waitFor(() => {
      expect(screen.getByTestId('order-type-pres1')).toBeInTheDocument();
    });
  });

  it('excludes prescriptions that do not match any strategy', async () => {
    setupFirestoreMock([{
      ...mockPrescriptions[0],
      userId:        'other-user',
      customerPhone: '+94000000000', // doesn't match currentUser phone
    }]);
    setupFetchMock([]);
    renderOrders();
    await waitFor(() => {
      expect(screen.queryByTestId('order-type-pres1')).not.toBeInTheDocument();
    });
  });

  // =========================
  // DEDUPLICATION TESTS
  // =========================
  it('hides a regular order that is already linked to a prescription via rxId', async () => {
    // order1 is linked to pres1 — it should be hidden since pres1 card covers it
    setupFetchMock([{ ...mockOrders[0], rxId: 'pres1' }]);
    renderOrders();
    await waitFor(() => {
      // Only prescription card should exist, not a duplicate regular order card
      const cards = screen.getAllByTestId('order-card');
      const types = cards.map(c => c.querySelector('[data-testid^="order-type-"]')?.textContent);
      expect(types).not.toContain('regular');
    });
  });

  it('keeps a regular order that has no rxId linkage', async () => {
    renderOrders();
    await waitFor(() => {
      expect(screen.getByTestId('order-type-order1')).toHaveTextContent('regular');
    });
  });

  // =========================
  // SORT ORDER TESTS
  // =========================
  it('renders items sorted newest-first by createdAt', async () => {
    renderOrders();
    await waitFor(() => {
      const cards = screen.getAllByTestId('order-card');
      // order1 (seconds: 1700000200) > order2 (seconds: 1700000100) > pres1 (seconds: 1700000050)
      expect(cards[0]).toHaveTextContent('John Doe');   // order1
      expect(cards[1]).toHaveTextContent('Jane Smith'); // order2
    });
  });

  // =========================
  // NAVIGATION TESTS
  // =========================
  it('navigates to prescription page when Upload Prescription is clicked', async () => {
    renderOrders();
    await waitFor(() => screen.getByText('Upload Prescription'));
    fireEvent.click(screen.getByText('Upload Prescription'));
    expect(mockNavigate).toHaveBeenCalledWith('/customer/prescription');
  });

  it('navigates to prescription page when View History is clicked', async () => {
    renderOrders();
    await waitFor(() => screen.getByText('View History'));
    fireEvent.click(screen.getByText('View History'));
    expect(mockNavigate).toHaveBeenCalledWith('/customer/prescription');
  });

});