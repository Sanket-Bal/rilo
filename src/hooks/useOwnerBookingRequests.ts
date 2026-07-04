import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type BookingRequest = {
  id: string;
  booking_id: string;
  bike_id: string;
  bike_name: string;
  bike_type: string;
  owner_id: string;
  renter_id: string;
  renter_name: string;
  renter_email: string;
  duration: number;
  price_per_hour: number;
  deposit: number;
  platform_fee: number;
  estimated_fare: number;
  total_payable: number;
  payment_method: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled' | 'completed';
  requested_at: string;
  expires_at: string;
  approved_at?: string;
  rejection_reason?: string;
};

export function useOwnerBookingRequests(ownerId: string | undefined) {
  const [currentRequest, setCurrentRequest] = useState<BookingRequest | null>(null);
  const [pendingRequests, setPendingRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscriptionRef = useRef<any>(null);
  const requestsRef = useRef<BookingRequest[]>([]);

  const fetchPendingRequests = useCallback(async () => {
    if (!ownerId) return;

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('booking_requests')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (fetchError) {
        console.log('Error fetching pending requests:', fetchError);
        setError(fetchError.message);
        return;
      }

      const typed = (data || []) as BookingRequest[];
      setPendingRequests(typed);
      requestsRef.current = typed;

      if (typed.length > 0 && !currentRequest) {
        setCurrentRequest(typed[0]);
      }

      console.log(`[useOwnerBookingRequests] Fetched ${typed.length} pending requests for owner ${ownerId}`);
    } catch (err) {
      console.log('Error in fetchPendingRequests:', err);
    } finally {
      setLoading(false);
    }
  }, [ownerId, currentRequest]);

  useEffect(() => {
    if (!ownerId) {
      console.log('[useOwnerBookingRequests] No ownerId, skipping subscription');
      return;
    }

    console.log(`[useOwnerBookingRequests] Setting up realtime subscription for owner ${ownerId}`);

    fetchPendingRequests();

    const subscription = supabase
      .channel(`booking_requests_owner_${ownerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_requests',
          filter: `owner_id=eq.${ownerId}`,
        },
        (payload) => {
          console.log('[useOwnerBookingRequests] INSERT event:', payload);
          const newRequest = payload.new as BookingRequest;

          if (newRequest.status === 'pending') {
            setPendingRequests((prev) => {
              const updated = [newRequest, ...prev];
              requestsRef.current = updated;
              return updated;
            });

            setCurrentRequest((curr) => curr || newRequest);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'booking_requests',
          filter: `owner_id=eq.${ownerId}`,
        },
        (payload) => {
          console.log('[useOwnerBookingRequests] UPDATE event:', payload);
          const updated = payload.new as BookingRequest;

          if (updated.status === 'cancelled') {
            console.log('[useOwnerBookingRequests] Request was cancelled by renter');
            setCurrentRequest((curr) =>
              curr?.id === updated.id ? null : curr
            );
          }

          setPendingRequests((prev) => {
            const updated_list = prev.map((req) =>
              req.id === updated.id ? updated : req
            );
            requestsRef.current = updated_list;
            return updated_list;
          });
        }
      )
      .subscribe((status) => {
        console.log(`[useOwnerBookingRequests] Subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log('[useOwnerBookingRequests] ✅ Realtime subscribed successfully');
        }
      });

    subscriptionRef.current = subscription;

    return () => {
      console.log('[useOwnerBookingRequests] Cleaning up subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [ownerId, fetchPendingRequests]);

  const approveRequest = useCallback(
    async (requestId: string) => {
      try {
        const { error } = await supabase
          .from('booking_requests')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        if (error) {
          console.log('Error approving request:', error);
          setError(error.message);
          return;
        }

        console.log('[useOwnerBookingRequests] Request approved:', requestId);
        setCurrentRequest(null);
      } catch (err) {
        console.log('Error in approveRequest:', err);
      }
    },
    []
  );

  const rejectRequest = useCallback(
    async (requestId: string, reason?: string) => {
      try {
        const { error } = await supabase
          .from('booking_requests')
          .update({
            status: 'rejected',
            rejected_at: new Date().toISOString(),
            rejection_reason: reason || 'Rejected by owner',
          })
          .eq('id', requestId);

        if (error) {
          console.log('Error rejecting request:', error);
          setError(error.message);
          return;
        }

        console.log('[useOwnerBookingRequests] Request rejected:', requestId);
        setCurrentRequest(null);
      } catch (err) {
        console.log('Error in rejectRequest:', err);
      }
    },
    []
  );

  const dismissRequest = useCallback(() => {
    console.log('[useOwnerBookingRequests] Dismissing current request modal');
    setCurrentRequest(null);
  }, []);

  return {
    currentRequest,
    pendingRequests,
    loading,
    error,
    approveRequest,
    rejectRequest,
    dismissRequest,
    fetchPendingRequests,
  };
}

export function useOwnerBookingRequestCount(ownerId: string | undefined) {
  const [count, setCount] = useState(0);
  const { pendingRequests } = useOwnerBookingRequests(ownerId);

  useEffect(() => {
    setCount(pendingRequests.length);
  }, [pendingRequests]);

  return count;
}