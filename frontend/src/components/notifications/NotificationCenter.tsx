import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Clock, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const NotificationCenter = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useGreenGaugeStore();

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="w-5 h-5 text-danger" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      default:
        return <Info className="w-5 h-5 text-accent" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="mt-4 flex flex-col h-full">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">{unreadCount} unread</span>
          <Button variant="ghost" size="sm" onClick={markAllNotificationsRead}>
            Mark all read
          </Button>
        </div>
      )}

      <div className="space-y-3 flex-1 overflow-y-auto">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={cn(
              "p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md",
              notification.read 
                ? "bg-background border-border" 
                : "bg-primary/5 border-primary/20"
            )}
            onClick={() => markNotificationRead(notification.id)}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-medium text-foreground text-sm">{notification.title}</h4>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                  </div>
                  {notification.loanId && (
                    <Link 
                      to={`/loan/${notification.loanId}`}
                      className="text-xs text-primary hover:underline"
                    >
                      View Loan
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No notifications</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
