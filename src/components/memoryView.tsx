import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MemoryTableProps {
    memory: Record<string, number>
}

export default function MemoryView({ memory }: MemoryTableProps) {
    const data = Object.entries(memory).map(([address, value]) => ({
        address,
        value
    }))

    return (
        <ScrollArea className="h-[30vh]">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Address</TableHead>
                        <TableHead>Value</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={2} className="h-[25vh] text-center text-muted-foreground">
                                Memory Empty
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((row) => (
                            <TableRow key={row.address}>
                                <TableCell>
                                    {row.address}
                                </TableCell>
                                <TableCell>
                                    {row.value}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
    )
}