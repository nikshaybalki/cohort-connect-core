import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";

export function ClubSidebarRight() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <aside className="hidden xl:block w-[280px] flex-shrink-0 space-y-4">
      <Card className="rounded-xl overflow-hidden">
        <div className="h-20 bg-muted" aria-hidden />
        <CardContent className="pt-0">
          <div className="-mt-8 mb-2 flex items-center">
            <div className="h-14 w-14 rounded-full border-4 border-background bg-secondary flex items-center justify-center text-lg">📷</div>
            <div className="ml-3">
              <div className="text-sm font-semibold">Photography Club</div>
              <div className="text-xs text-muted-foreground">Capturing moments, creating memories</div>
            </div>
          </div>
          <div className="text-xs text-accent font-medium">👥 142 members</div>
        </CardContent>
      </Card>

      {/* <Card className="rounded-xl">
        <CardContent>
          <Calendar mode="single" selected={date} onSelect={setDate} className="w-full" />
        </CardContent>
      </Card> */}

<Card className="rounded-xl">
  <CardContent className="p-2">
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      className="w-full mx-auto text-sm [&_.rdp-day]:h-8 [&_.rdp-day]:w-8 [&_.rdp-day]:p-0 [&_.rdp-caption]:text-sm [&_.rdp-nav_button]:w-7 [&_.rdp-nav_button]:h-7"
    />
  </CardContent>
</Card>





      <div>
        <h3 className="text-sm font-semibold mb-2">Announcements</h3>
        <div className="space-y-2">
          {[{t:'📢 Workshop Tomorrow', d:'Design workshop at 3 PM in Room 201...', time:'2h'}, {t:'🎯 New Project Assignment', d:'Check resources for kickoff materials.', time:'1d'}].map(a => (
            <Card key={a.t} className="rounded-xl">
              <CardContent className="p-4">
                <div className="text-sm font-medium">{a.t}</div>
                <div className="text-xs text-muted-foreground">{a.d}</div>
                <div className="text-xs text-muted-foreground mt-1">{a.time}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </aside>
  );
}
