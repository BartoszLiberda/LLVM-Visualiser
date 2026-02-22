import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

interface RegisterViewProps {
    registers: Record<string, number>
}

export default function RegisterView({ registers }: RegisterViewProps) {
    const data = Object.entries(registers).map(([name, value]) => ({
        name,
        value
    }));

    return (
        <div className="flex flex-col h-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-1/2">Register</TableHead>
                        <TableHead className="w-1/2">Value</TableHead>
                    </TableRow>
                </TableHeader>
            </Table>
            <ScrollArea className="flex-1 min-h-0">
                <Table>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={2} className="flex-1 min-h-0 text-center text-muted-foreground">
                                    No registers active
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((reg) => (
                                <TableRow key={reg.name}>
                                    <TableCell className="w-1/2">
                                        {reg.name}
                                    </TableCell>
                                    <TableCell className="w-1/2">
                                        {reg.value >= 0x7000 ? `0x${reg.value.toString(16)}` : reg.value}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    )
}